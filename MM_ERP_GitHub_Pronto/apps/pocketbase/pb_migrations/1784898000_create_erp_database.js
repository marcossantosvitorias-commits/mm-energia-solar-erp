/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const authenticated = "@request.auth.id != ''"

  function collectionExists(name) {
    try {
      app.findCollectionByNameOrId(name)
      return true
    } catch {
      return false
    }
  }

  function saveCollection(config) {
    if (collectionExists(config.name)) return
    app.save(new Collection(config))
  }

  saveCollection({
    type: "auth",
    name: "users",
    listRule: authenticated,
    viewRule: authenticated,
    createRule: null,
    updateRule: "id = @request.auth.id || @request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'",
    fields: [
      { name: "name", type: "text", required: true, max: 120 },
      { name: "role", type: "select", required: true, maxSelect: 1, values: ["admin", "financeiro", "comercial", "engenharia", "instalacao", "consulta"] },
      { name: "active", type: "bool" },
      { name: "phone", type: "text", max: 30 },
    ],
    indexes: [
      "CREATE INDEX idx_users_role ON users (role)",
      "CREATE INDEX idx_users_active ON users (active)",
    ],
    passwordAuth: { enabled: true },
  })

  saveCollection({
    type: "base",
    name: "clients",
    listRule: authenticated,
    viewRule: authenticated,
    createRule: authenticated,
    updateRule: authenticated,
    deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'comercial'",
    fields: [
      { name: "name", type: "text", required: true, max: 180 },
      { name: "document", type: "text", max: 30 },
      { name: "phone", type: "text", required: true, max: 30 },
      { name: "email", type: "email" },
      { name: "city", type: "text", max: 100 },
      { name: "state", type: "text", max: 2 },
      { name: "customerType", type: "select", maxSelect: 1, values: ["residencial", "comercial", "rural", "industrial", "publico"] },
      { name: "status", type: "select", maxSelect: 1, values: ["lead", "qualificado", "proposta", "negociacao", "cliente", "perdido"] },
      { name: "monthlyBill", type: "number", min: 0 },
      { name: "source", type: "text", max: 100 },
      { name: "notes", type: "editor" },
      { name: "createdBy", type: "relation", collectionId: "users", maxSelect: 1 },
    ],
    indexes: [
      "CREATE INDEX idx_clients_name ON clients (name)",
      "CREATE INDEX idx_clients_phone ON clients (phone)",
      "CREATE INDEX idx_clients_status ON clients (status)",
      "CREATE INDEX idx_clients_document ON clients (document)",
    ],
  })

  saveCollection({
    type: "base",
    name: "suppliers",
    listRule: authenticated,
    viewRule: authenticated,
    createRule: authenticated,
    updateRule: authenticated,
    deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'financeiro'",
    fields: [
      { name: "name", type: "text", required: true, max: 180 },
      { name: "document", type: "text", max: 30 },
      { name: "phone", type: "text", max: 30 },
      { name: "email", type: "email" },
      { name: "category", type: "text", max: 100 },
      { name: "notes", type: "editor" },
    ],
    indexes: ["CREATE INDEX idx_suppliers_name ON suppliers (name)"],
  })

  saveCollection({
    type: "base",
    name: "financial_transactions",
    listRule: authenticated,
    viewRule: authenticated,
    createRule: authenticated,
    updateRule: authenticated,
    deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'financeiro'",
    fields: [
      { name: "externalId", type: "text", required: true, max: 180 },
      { name: "description", type: "text", required: true, max: 300 },
      { name: "type", type: "select", required: true, maxSelect: 1, values: ["entrada", "saida"] },
      { name: "category", type: "text", max: 120 },
      { name: "amount", type: "number", required: true, min: 0 },
      { name: "transactionDate", type: "date", required: true },
      { name: "paymentMethod", type: "text", max: 80 },
      { name: "bankAccount", type: "text", max: 100 },
      { name: "source", type: "text", max: 100 },
      { name: "fitid", type: "text", max: 180 },
      { name: "client", type: "relation", collectionId: "clients", maxSelect: 1 },
      { name: "supplier", type: "relation", collectionId: "suppliers", maxSelect: 1 },
      { name: "notes", type: "editor" },
      { name: "createdBy", type: "relation", collectionId: "users", maxSelect: 1 },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_financial_transactions_external_id ON financial_transactions (externalId)",
      "CREATE INDEX idx_financial_transactions_date ON financial_transactions (transactionDate)",
      "CREATE INDEX idx_financial_transactions_type ON financial_transactions (type)",
      "CREATE INDEX idx_financial_transactions_category ON financial_transactions (category)",
    ],
  })

  saveCollection({
    type: "base",
    name: "accounts_payable",
    listRule: authenticated,
    viewRule: authenticated,
    createRule: authenticated,
    updateRule: authenticated,
    deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'financeiro'",
    fields: [
      { name: "externalId", type: "text", required: true, max: 180 },
      { name: "description", type: "text", required: true, max: 300 },
      { name: "supplierName", type: "text", max: 180 },
      { name: "supplier", type: "relation", collectionId: "suppliers", maxSelect: 1 },
      { name: "category", type: "text", max: 120 },
      { name: "amount", type: "number", required: true, min: 0 },
      { name: "dueDate", type: "date", required: true },
      { name: "paidDate", type: "date" },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["pendente", "paga", "atrasada", "cancelada"] },
      { name: "paymentMethod", type: "text", max: 80 },
      { name: "source", type: "text", max: 100 },
      { name: "notes", type: "editor" },
      { name: "createdBy", type: "relation", collectionId: "users", maxSelect: 1 },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_accounts_payable_external_id ON accounts_payable (externalId)",
      "CREATE INDEX idx_accounts_payable_due_date ON accounts_payable (dueDate)",
      "CREATE INDEX idx_accounts_payable_status ON accounts_payable (status)",
    ],
  })

  saveCollection({
    type: "base",
    name: "accounts_receivable",
    listRule: authenticated,
    viewRule: authenticated,
    createRule: authenticated,
    updateRule: authenticated,
    deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'financeiro'",
    fields: [
      { name: "externalId", type: "text", required: true, max: 180 },
      { name: "description", type: "text", required: true, max: 300 },
      { name: "clientName", type: "text", max: 180 },
      { name: "client", type: "relation", collectionId: "clients", maxSelect: 1 },
      { name: "category", type: "text", max: 120 },
      { name: "amount", type: "number", required: true, min: 0 },
      { name: "dueDate", type: "date", required: true },
      { name: "receivedDate", type: "date" },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["pendente", "recebida", "atrasada", "cancelada"] },
      { name: "paymentMethod", type: "text", max: 80 },
      { name: "source", type: "text", max: 100 },
      { name: "notes", type: "editor" },
      { name: "createdBy", type: "relation", collectionId: "users", maxSelect: 1 },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_accounts_receivable_external_id ON accounts_receivable (externalId)",
      "CREATE INDEX idx_accounts_receivable_due_date ON accounts_receivable (dueDate)",
      "CREATE INDEX idx_accounts_receivable_status ON accounts_receivable (status)",
    ],
  })

  saveCollection({
    type: "base",
    name: "data_imports",
    listRule: authenticated,
    viewRule: authenticated,
    createRule: authenticated,
    updateRule: null,
    deleteRule: "@request.auth.role = 'admin'",
    fields: [
      { name: "fileName", type: "text", required: true, max: 255 },
      { name: "fileType", type: "select", required: true, maxSelect: 1, values: ["ofx", "csv", "manual", "api"] },
      { name: "checksum", type: "text", required: true, max: 180 },
      { name: "importedRecords", type: "number", min: 0 },
      { name: "duplicateRecords", type: "number", min: 0 },
      { name: "ignoredRecords", type: "number", min: 0 },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["concluida", "parcial", "erro"] },
      { name: "details", type: "json" },
      { name: "createdBy", type: "relation", collectionId: "users", maxSelect: 1 },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_data_imports_checksum ON data_imports (checksum)"],
  })
}, (app) => {
  const collections = [
    "data_imports",
    "accounts_receivable",
    "accounts_payable",
    "financial_transactions",
    "suppliers",
    "clients",
    "users",
  ]

  collections.forEach((name) => {
    try {
      app.delete(app.findCollectionByNameOrId(name))
    } catch {
      // Collection may not exist when reverting a partial migration.
    }
  })
})
