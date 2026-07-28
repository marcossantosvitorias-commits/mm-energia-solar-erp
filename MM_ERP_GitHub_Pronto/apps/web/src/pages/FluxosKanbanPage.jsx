import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, GripVertical, LayoutPanelTop, Plus, Search, Trash2, X } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { createWorkflowCard, deleteWorkflowCard, getWorkflowBoard, listWorkflowBoards, moveWorkflowCard } from '../services/workflowService.js';

const boardLabels = {
  sales: 'Vendas',
  engineering: 'Engenharia',
  installation: 'Instalações',
  after_sales: 'Pós-venda',
};

const priorityLabels = { low: 'Baixa', normal: 'Normal', high: 'Alta', urgent: 'Urgente' };
const emptyCard = { title: '', description: '', priority: 'normal', dueAt: '' };
const formatDate = (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '';
const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FluxosKanbanPage() {
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState('');
  const [boardData, setBoardData] = useState({ board: null, columns: [], cards: [] });
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [newCardColumn, setNewCardColumn] = useState(null);
  const [cardForm, setCardForm] = useState(emptyCard);
  const [saving, setSaving] = useState(false);

  const loadBoards = async () => {
    setLoading(true);
    try {
      const rows = await listWorkflowBoards();
      setBoards(rows);
      const selectedId = activeBoardId || rows[0]?.id || '';
      setActiveBoardId(selectedId);
      if (selectedId) setBoardData(await getWorkflowBoard(selectedId));
    } catch (error) {
      setMessage(error?.message || 'Não foi possível carregar os fluxos. Aplique a migration dos Kanbans no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBoards(); }, []);

  const changeBoard = async (boardId) => {
    setActiveBoardId(boardId);
    setLoading(true);
    setMessage('');
    try { setBoardData(await getWorkflowBoard(boardId)); }
    catch (error) { setMessage(error?.message || 'Não foi possível abrir este quadro.'); }
    finally { setLoading(false); }
  };

  const filteredCards = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return boardData.cards;
    return boardData.cards.filter((card) => [card.title, card.description, card.clients?.name, card.clients?.city, card.clients?.phone]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(term)));
  }, [boardData.cards, query]);

  const cardsByColumn = useMemo(() => Object.fromEntries(boardData.columns.map((column) => [
    column.id,
    filteredCards.filter((card) => card.column_id === column.id).sort((a, b) => Number(a.position) - Number(b.position)),
  ])), [boardData.columns, filteredCards]);

  const moveCard = async (columnId) => {
    if (!draggedCardId) return;
    const previous = boardData.cards;
    setBoardData((current) => ({ ...current, cards: current.cards.map((card) => card.id === draggedCardId ? { ...card, column_id: columnId, position: Date.now() } : card) }));
    try {
      await moveWorkflowCard(draggedCardId, columnId);
      setMessage('Card movido e histórico registrado.');
    } catch (error) {
      setBoardData((current) => ({ ...current, cards: previous }));
      setMessage(error?.message || 'Não foi possível mover o card.');
    } finally { setDraggedCardId(null); }
  };

  const submitCard = async (event) => {
    event.preventDefault();
    if (!newCardColumn || !activeBoardId) return;
    setSaving(true);
    try {
      const created = await createWorkflowCard(activeBoardId, newCardColumn.id, {
        ...cardForm,
        dueAt: cardForm.dueAt ? new Date(cardForm.dueAt).toISOString() : null,
      });
      setBoardData((current) => ({ ...current, cards: [...current.cards, created] }));
      setCardForm(emptyCard);
      setNewCardColumn(null);
      setMessage('Novo card criado com sucesso.');
    } catch (error) { setMessage(error?.message || 'Não foi possível criar o card.'); }
    finally { setSaving(false); }
  };

  const removeCard = async (card) => {
    if (!window.confirm(`Excluir o card “${card.title}”?`)) return;
    try {
      await deleteWorkflowCard(card.id);
      setBoardData((current) => ({ ...current, cards: current.cards.filter((item) => item.id !== card.id) }));
    } catch (error) { setMessage(error?.message || 'Não foi possível excluir o card.'); }
  };

  const totalValue = filteredCards.reduce((sum, card) => sum + Number(card.sales_proposals?.total_amount || card.metadata?.estimatedValue || 0), 0);
  const urgentCount = filteredCards.filter((card) => card.priority === 'urgent').length;
  const overdueCount = filteredCards.filter((card) => card.due_at && new Date(card.due_at) < new Date()).length;

  return (
    <FinanceLayout title="Fluxos e Kanbans" subtitle="Vendas, engenharia, instalações e pós-venda em uma única operação.">
      {message && <div className="finance-card" style={{ marginBottom: 14 }}><strong>{message}</strong></div>}

      <section className="finance-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <LayoutPanelTop size={20} />
          {boards.map((board) => <button type="button" key={board.id} onClick={() => changeBoard(board.id)} style={{ fontWeight: activeBoardId === board.id ? 800 : 500 }}>
            {boardLabels[board.board_type] || board.name}
          </button>)}
          <div style={{ flex: 1 }} />
          <Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar cliente, cidade ou card" style={{ minWidth: 240 }} />
        </div>
      </section>

      <section className="finance-grid" style={{ marginBottom: 16 }}>
        <article className="finance-card"><span>Cards no quadro</span><h2>{filteredCards.length}</h2></article>
        <article className="finance-card"><span>Valor relacionado</span><h2>{money(totalValue)}</h2></article>
        <article className="finance-card"><span>Urgentes</span><h2>{urgentCount}</h2></article>
        <article className="finance-card"><span>Atrasados</span><h2>{overdueCount}</h2></article>
      </section>

      {loading ? <section className="finance-card"><p>Carregando quadro...</p></section> : (
        <section style={{ overflowX: 'auto', paddingBottom: 12 }}>
          <div style={{ display: 'flex', gap: 14, minWidth: 'max-content', alignItems: 'flex-start' }}>
            {boardData.columns.map((column) => (
              <div key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={() => moveCard(column.id)} style={{ width: 310, background: '#f1f5f9', borderRadius: 16, padding: 12, borderTop: `5px solid ${column.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <strong style={{ flex: 1 }}>{column.name}</strong>
                  <span style={{ background: '#fff', borderRadius: 999, padding: '3px 9px', fontSize: 12 }}>{cardsByColumn[column.id]?.length || 0}</span>
                  <button type="button" onClick={() => setNewCardColumn(column)} title="Adicionar card"><Plus size={18} /></button>
                </div>

                <div style={{ display: 'grid', gap: 10, minHeight: 90 }}>
                  {(cardsByColumn[column.id] || []).map((card) => {
                    const overdue = card.due_at && new Date(card.due_at) < new Date();
                    return <article key={card.id} draggable onDragStart={() => setDraggedCardId(card.id)} onDragEnd={() => setDraggedCardId(null)} style={{ background: '#fff', borderRadius: 13, padding: 13, boxShadow: '0 2px 8px rgba(15,23,42,.08)', cursor: 'grab', opacity: draggedCardId === card.id ? .55 : 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <GripVertical size={17} style={{ marginTop: 2 }} />
                        <div style={{ flex: 1 }}><strong>{card.title}</strong>{card.description && <p style={{ margin: '5px 0 0', fontSize: 13 }}>{card.description}</p>}</div>
                        <button type="button" onClick={() => removeCard(card)} title="Excluir"><Trash2 size={15} /></button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        <span style={{ fontSize: 11, borderRadius: 999, padding: '4px 8px', background: card.priority === 'urgent' ? '#fee2e2' : '#e2e8f0' }}>{priorityLabels[card.priority]}</span>
                        {card.clients?.city && <span style={{ fontSize: 11, borderRadius: 999, padding: '4px 8px', background: '#e0f2fe' }}>{card.clients.city}/{card.clients.state}</span>}
                        {card.sales_proposals?.total_amount && <span style={{ fontSize: 11, borderRadius: 999, padding: '4px 8px', background: '#dcfce7' }}>{money(card.sales_proposals.total_amount)}</span>}
                      </div>
                      {card.due_at && <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 9, fontSize: 12, color: overdue ? '#b91c1c' : '#475569' }}>{overdue ? <AlertTriangle size={14} /> : <CalendarClock size={14} />} {formatDate(card.due_at)}</div>}
                    </article>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {newCardColumn && <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.58)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 16 }}>
        <section className="finance-card" style={{ width: 'min(520px, 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}><div style={{ flex: 1 }}><h2 style={{ margin: 0 }}>Novo card</h2><p style={{ margin: '4px 0 0' }}>{newCardColumn.name}</p></div><button type="button" onClick={() => setNewCardColumn(null)}><X size={20} /></button></div>
          <form onSubmit={submitCard} className="finance-form-grid">
            <label>Título<input required value={cardForm.title} onChange={(event) => setCardForm({ ...cardForm, title: event.target.value })} placeholder="Ex.: João Silva — sistema 6,2 kWp" /></label>
            <label>Prioridade<select value={cardForm.priority} onChange={(event) => setCardForm({ ...cardForm, priority: event.target.value })}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Prazo<input type="datetime-local" value={cardForm.dueAt} onChange={(event) => setCardForm({ ...cardForm, dueAt: event.target.value })} /></label>
            <label style={{ gridColumn: '1 / -1' }}>Descrição<textarea rows="4" value={cardForm.description} onChange={(event) => setCardForm({ ...cardForm, description: event.target.value })} /></label>
            <button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Criar card'}</button>
          </form>
        </section>
      </div>}
    </FinanceLayout>
  );
}