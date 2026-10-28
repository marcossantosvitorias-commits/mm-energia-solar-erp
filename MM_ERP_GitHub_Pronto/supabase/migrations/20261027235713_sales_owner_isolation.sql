-- Isolamento por vendedor: nenhum dado existente é apagado ou transferido.
-- O limite inicial é a ativação desta migração; novos perfis recebem now().
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sales_access_from timestamptz NOT NULL DEFAULT now();
COMMENT ON COLUMN public.profiles.sales_access_from IS 'Vendedor acessa apenas registros próprios criados a partir desta data.';

CREATE OR REPLACE FUNCTION public.sales_scope_unrestricted()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND active AND role <> 'comercial'); $$;

CREATE OR REPLACE FUNCTION public.can_access_sales_record(record_owner uuid, record_created_at timestamptz)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.active AND
  (p.role <> 'comercial' OR (record_owner = p.id AND record_created_at >= p.sales_access_from))
); $$;

CREATE OR REPLACE FUNCTION public.can_access_sales_client(record_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.sales_scope_unrestricted() OR EXISTS (
  SELECT 1 FROM public.clients c WHERE c.id = record_client_id
  AND public.can_access_sales_record(c.created_by, c.created_at)
); $$;

CREATE OR REPLACE FUNCTION public.can_access_sales_proposal(record_proposal_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.sales_scope_unrestricted() OR EXISTS (
  SELECT 1 FROM public.sales_proposals p WHERE p.id = record_proposal_id
  AND public.can_access_sales_record(p.created_by, p.created_at)
  AND (p.client_id IS NULL OR public.can_access_sales_client(p.client_id))
); $$;

CREATE OR REPLACE FUNCTION public.protect_profile_sales_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() AND
    (NEW.id IS DISTINCT FROM OLD.id OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.active IS DISTINCT FROM OLD.active OR NEW.permissions IS DISTINCT FROM OLD.permissions
     OR NEW.sales_access_from IS DISTINCT FROM OLD.sales_access_from
     OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Somente o administrador pode alterar perfil, permissões e limite de acesso.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS profiles_protect_sales_scope ON public.profiles;
CREATE TRIGGER profiles_protect_sales_scope BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sales_scope();

CREATE OR REPLACE FUNCTION public.stamp_sales_record_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE record_data jsonb; BEGIN
  IF auth.role() <> 'authenticated' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF public.has_any_role(ARRAY['comercial']) THEN
      NEW.created_by := auth.uid();
      NEW.created_at := clock_timestamp();
    ELSE
      NEW.created_by := coalesce(NEW.created_by, auth.uid());
    END IF;
  ELSIF public.has_any_role(ARRAY['comercial']) THEN
    IF NOT public.can_access_sales_record(OLD.created_by, OLD.created_at) THEN
      RAISE EXCEPTION 'Registro fora da carteira do vendedor.' USING ERRCODE = '42501';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Não é permitido alterar o responsável ou a data original do cadastro.' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF public.has_any_role(ARRAY['comercial']) THEN
    record_data := to_jsonb(NEW);
    IF record_data->>'client_id' IS NOT NULL AND NOT public.can_access_sales_client((record_data->>'client_id')::uuid) THEN
      RAISE EXCEPTION 'Cliente fora da carteira do vendedor.' USING ERRCODE = '42501';
    END IF;
    IF record_data->>'proposal_id' IS NOT NULL AND NOT public.can_access_sales_proposal((record_data->>'proposal_id')::uuid) THEN
      RAISE EXCEPTION 'Proposta fora da carteira do vendedor.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- Políticas RESTRICTIVE são combinadas com AND às permissões existentes.
-- Preservam os demais perfis e impedem que uma política ampla reabra a carteira antiga.
DO $$ DECLARE table_name text; expression text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['clients','contracts','sales_proposals','client_proposals','appointments','belcred_simulations','erp_module_records','service_orders','engineering_projects','workflow_cards'] LOOP
    expression := 'public.can_access_sales_record(created_by, created_at)';
    IF table_name NOT IN ('clients','erp_module_records') THEN
      expression := expression || ' AND (client_id IS NULL OR public.can_access_sales_client(client_id))';
    END IF;
    IF table_name IN ('service_orders','workflow_cards') THEN
      expression := expression || ' AND (proposal_id IS NULL OR public.can_access_sales_proposal(proposal_id))';
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS seller_owner_scope ON public.%I', table_name);
    EXECUTE format('CREATE POLICY seller_owner_scope ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (%s) WITH CHECK (%s)', table_name, expression, expression);
    EXECUTE format('DROP TRIGGER IF EXISTS stamp_sales_record_owner ON public.%I', table_name);
    EXECUTE format('CREATE TRIGGER stamp_sales_record_owner BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.stamp_sales_record_owner()', table_name);
  END LOOP;
END; $$;

DO $$ DECLARE row_config record; expression text; BEGIN
  FOR row_config IN SELECT * FROM (VALUES
    ('client_interactions', 'public.can_access_sales_client(client_id)'),
    ('sales_proposal_versions', 'public.can_access_sales_proposal(proposal_id)'),
    ('crm_leadconnector_sync', 'public.can_access_sales_client(client_id)'),
    ('solar_simulations', 'public.can_access_sales_client(client_id)'),
    ('installed_systems', 'public.can_access_sales_client(client_id)'),
    ('whatsapp_conversations', 'public.can_access_sales_client(client_id)'),
    ('whatsapp_messages', 'EXISTS (SELECT 1 FROM public.whatsapp_conversations c WHERE c.id = conversation_id)'),
    ('workflow_card_history', 'EXISTS (SELECT 1 FROM public.workflow_cards c WHERE c.id = card_id)'),
    ('after_sales_interactions', 'EXISTS (SELECT 1 FROM public.installed_systems s WHERE s.id = installed_system_id)'),
    ('installed_system_warranties', 'EXISTS (SELECT 1 FROM public.installed_systems s WHERE s.id = installed_system_id)'),
    ('service_order_activities', 'EXISTS (SELECT 1 FROM public.service_orders s WHERE s.id = service_order_id)'),
    ('service_order_items', 'EXISTS (SELECT 1 FROM public.service_orders s WHERE s.id = service_order_id)'),
    ('service_order_checklist', 'EXISTS (SELECT 1 FROM public.service_orders s WHERE s.id = service_order_id)'),
    ('service_order_field_events', 'EXISTS (SELECT 1 FROM public.service_orders s WHERE s.id = service_order_id)'),
    ('service_order_photos', 'EXISTS (SELECT 1 FROM public.service_orders s WHERE s.id = service_order_id)'),
    ('service_order_signatures', 'EXISTS (SELECT 1 FROM public.service_orders s WHERE s.id = service_order_id)'),
    ('engineering_project_tasks', 'EXISTS (SELECT 1 FROM public.engineering_projects p WHERE p.id = project_id)'),
    ('engineering_project_documents', 'EXISTS (SELECT 1 FROM public.engineering_projects p WHERE p.id = project_id)'),
    ('engineering_project_activities', 'EXISTS (SELECT 1 FROM public.engineering_projects p WHERE p.id = project_id)'),
    ('bling_contacts', 'false'),
    ('sales_orders', 'false'),
    ('leadconnector_contacts_archive', 'false'),
    ('leadconnector_opportunities_archive', 'false'),
    ('wesales_opportunity_snapshot', 'false')
  ) AS configs(table_name, condition) LOOP
    expression := 'public.sales_scope_unrestricted() OR (' || row_config.condition || ')';
    EXECUTE format('DROP POLICY IF EXISTS seller_related_scope ON public.%I', row_config.table_name);
    EXECUTE format('CREATE POLICY seller_related_scope ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (%s) WITH CHECK (%s)', row_config.table_name, expression, expression);
  END LOOP;
END; $$;

-- RPCs internas não podem ignorar as políticas ao serem chamadas diretamente.
ALTER FUNCTION public.save_sales_proposal_version(uuid) SECURITY INVOKER;
ALTER FUNCTION public.confirm_accepted_proposal_sale(uuid, text) SECURITY INVOKER;
ALTER FUNCTION public.reject_accepted_proposal_confirmation(uuid, text) SECURITY INVOKER;
ALTER FUNCTION public.ensure_proposal_sales_card(uuid) SECURITY INVOKER;
ALTER FUNCTION public.mark_bad_lead(uuid, text, text) SECURITY INVOKER;

-- Clientes continuam podendo abrir/aceitar suas propostas públicas por token.
-- Os tokens antigos não ficam disponíveis nas listagens do vendedor.
