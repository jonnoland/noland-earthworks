#!/usr/bin/env python3
"""Replace the CreateQuoteModal return JSX (lines 1114-1371) with a Jobber-style layout."""

with open('client/src/pages/ops/Quotes.tsx', 'r') as f:
    lines = f.readlines()

# Lines are 1-indexed; slice is 0-indexed
# Keep lines 1-1113 and 1372-end, replace 1114-1371 with new JSX
before = lines[:1113]   # lines 1..1113
after  = lines[1371:]   # lines 1372..end

new_jsx = '''  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-card">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <PlusCircle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground leading-tight">New Quote</h3>
              <p className="text-[11px] text-muted-foreground leading-tight">Draft will be created in Jobber</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body: two-column ── */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* Left column — client, title, message */}
          <div className="w-80 shrink-0 border-r border-border flex flex-col overflow-y-auto bg-secondary/10">
            {/* Client section */}
            <div className="px-5 pt-5 pb-4 border-b border-border space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Client</p>
              {selectedClient ? (
                <div className="rounded-lg bg-card border border-border px-3 py-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {selectedClient.name || selectedClient.companyName || "—"}
                    </p>
                    {selectedClient.emails?.[0]?.address && (
                      <p className="text-[11px] text-muted-foreground truncate">{selectedClient.emails[0].address}</p>
                    )}
                    {selectedClient.phones?.[0]?.number && (
                      <p className="text-[11px] text-muted-foreground">{selectedClient.phones[0].number}</p>
                    )}
                  </div>
                  <button
                    onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                    aria-label="Change client"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-card border-border"
                    />
                  </div>
                  {clientsLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                    </div>
                  ) : filteredClients.length > 0 ? (
                    <div className="rounded-lg border border-border bg-card max-h-44 overflow-y-auto divide-y divide-border">
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedClient(c); setClientSearch(""); }}
                          className="w-full text-left px-3 py-2 hover:bg-secondary/40 transition-colors"
                        >
                          <p className="text-xs font-medium text-foreground">{c.name || c.companyName || "—"}</p>
                          {c.emails?.[0]?.address && (
                            <p className="text-[11px] text-muted-foreground">{c.emails[0].address}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : clientSearch ? (
                    <p className="text-xs text-muted-foreground py-1">No clients found.</p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Title section */}
            <div className="px-5 pt-4 pb-4 border-b border-border space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Quote Title <span className="text-destructive">*</span></p>
              <Input
                placeholder="e.g. Forestry Mulching — 5 Acres"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs bg-card border-border"
              />
            </div>

            {/* Message section */}
            <div className="px-5 pt-4 pb-5 flex-1 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Client Message</p>
              <textarea
                placeholder="Notes or message to include on the quote..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Right column — line items */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Line items header */}
            <div className="px-5 pt-5 pb-3 border-b border-border shrink-0 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Line Items <span className="text-destructive">*</span>
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowServicePicker((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  From Services
                </button>
                <button
                  onClick={addBlankLineItem}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Custom Item
                </button>
              </div>
            </div>

            {/* Service picker */}
            {showServicePicker && (
              <div className="border-b border-border bg-secondary/10 px-5 py-3 shrink-0">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search services..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-card border-border"
                    autoFocus
                  />
                </div>
                <div className="rounded-lg border border-border bg-card max-h-40 overflow-y-auto divide-y divide-border">
                  {servicesLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-3">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading services…
                    </div>
                  ) : activeServices.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3">No services found.</p>
                  ) : (
                    activeServices.map((svc) => (
                      <button
                        key={svc.id}
                        onClick={() => addServiceAsLineItem(svc)}
                        className="w-full text-left px-3 py-2 hover:bg-secondary/40 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{svc.name}</p>
                          {svc.description && (
                            <p className="text-[11px] text-muted-foreground truncate">{svc.description}</p>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-foreground shrink-0">
                          {svc.unitPrice > 0 ? `$${svc.unitPrice.toFixed(2)}` : "—"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Line items list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {lineItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-secondary/40 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No line items yet. Add from your services or enter a custom item.
                  </p>
                </div>
              ) : (
                lineItems.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-card p-3 space-y-2.5">
                    {/* Row 1: name + remove */}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Item name *"
                        value={item.name}
                        onChange={(e) => updateLineItem(idx, "name", e.target.value)}
                        className="flex-1 h-8 text-xs bg-secondary/20 border-border font-medium"
                      />
                      <button
                        onClick={() => removeLineItem(idx)}
                        className="shrink-0 text-muted-foreground hover:text-red-400 transition-colors p-1"
                        aria-label="Remove line item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Row 2: description */}
                    <Input
                      placeholder="Description (optional)"
                      value={item.description}
                      onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                      className="h-7 text-xs bg-secondary/20 border-border text-muted-foreground"
                    />
                    {/* Row 3: qty + unit price + total */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-muted-foreground whitespace-nowrap">Qty</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 1)}
                          className="w-16 h-7 rounded-md border border-border bg-secondary/20 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-center"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-muted-foreground whitespace-nowrap">Unit Price</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateLineItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="w-24 h-7 rounded-md border border-border bg-secondary/20 pl-5 pr-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                      <div className="ml-auto text-xs font-semibold text-foreground">
                        {formatMoney(item.quantity * item.unitPrice)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Subtotal bar */}
            {lineItems.length > 0 && (
              <div className="px-5 py-3 border-t border-border shrink-0 bg-secondary/10 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{lineItems.length} line item{lineItems.length !== 1 ? "s" : ""}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Subtotal</span>
                  <span className="text-sm font-bold text-foreground">{formatMoney(subtotal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3 bg-card">
          <p className="text-[11px] text-muted-foreground">Quote will be saved as a Draft in Jobber.</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={createQuote.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createQuote.isPending || !selectedClient || !title.trim() || lineItems.length === 0}
              className="min-w-[110px]"
            >
              {createQuote.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Creating…</>
              ) : (
                "Create Quote"
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
'''

middle = new_jsx.splitlines(keepends=True)

result = before + middle + after
with open('client/src/pages/ops/Quotes.tsx', 'w') as f:
    f.writelines(result)

print(f"Done. Total lines: {len(result)}")
