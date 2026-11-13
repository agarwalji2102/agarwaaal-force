"use client";
import { useId, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { MagnifyingGlass, X, MapPin, User } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { normalizeHouseholdSearch, searchHouseholds } from "@/lib/household-search";
const displayName = (value?: string) => value?.replace(/^\[Demo\]\s*/, "") || "Name not on file";
const displayAddress = (value: string) => value.replace(/^\[Browser demo\]\s*/, "");
export function HouseholdSearch({ selectedId, onSelect, onClear }: { selectedId: Id<"households"> | null; onSelect: (id: Id<"households">) => void; onClear: () => void }) {
  const homes = useQuery(api.households.coverage);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(true);
  const inputId = useId();
  const resultsId = useId();
  const matches = useMemo(() => searchHouseholds(homes ?? [], query), [homes, query]);
  const hasQuery = Boolean(normalizeHouseholdSearch(query));
  const selected = homes?.find(home => home._id === selectedId);
  const clear = () => { setQuery(""); setExpanded(true); onClear(); };
  function select(id: Id<"households">) { onSelect(id); setExpanded(false); }
  return <section aria-label="Find a household" className="card flex shrink-0 flex-col overflow-hidden">
    <form role="search" onSubmit={event => { event.preventDefault(); if (matches[0]) select(matches[0]._id); }} className="p-3">
      <label htmlFor={inputId} className="type-small mb-2 block font-semibold">Find a household</label>
      <div className="flex items-center gap-2 rounded-xl border border-panel-raised bg-panel-raised px-3 focus-within:ring-2 focus-within:ring-on-panel/50">
        <MagnifyingGlass className="size-4 shrink-0 text-on-panel-muted" aria-hidden />
        <input id={inputId} type="search" value={query} maxLength={120} placeholder="Street address or resident name" autoComplete="off" aria-controls={hasQuery ? resultsId : undefined} onChange={event => { setQuery(event.target.value); setExpanded(true); if (!event.target.value.trim()) onClear(); }} onFocus={() => setExpanded(true)} onKeyDown={event => { if (event.key === "Escape") clear(); }} className="type-small h-11 min-w-0 flex-1 bg-transparent text-on-panel outline-none placeholder:text-on-panel-muted" />
        {query && <button type="button" onClick={clear} aria-label="Clear household search" className="grid size-7 shrink-0 place-items-center rounded-lg hover:bg-panel"><X className="size-4" /></button>}
      </div>
    </form>
    {hasQuery && expanded && <SearchResults id={resultsId} loading={homes === undefined} matches={matches} selectedId={selectedId} onSelect={select} />}
    {selected && !expanded && <div className="flex items-start gap-2 border-t border-panel-raised px-3 py-2"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /><div className="min-w-0 flex-1"><p className="type-small truncate font-semibold">Viewing {displayName(selected.residentName)}</p><p className="type-small truncate text-on-panel-muted">{displayAddress(selected.address)}</p></div><button type="button" aria-label="Close selected household" onClick={onClear} className="grid size-7 shrink-0 place-items-center rounded-lg hover:bg-panel-raised"><X className="size-4" /></button></div>}
  </section>;
}
type Home = NonNullable<ReturnType<typeof useQuery<typeof api.households.coverage>>>[number];
function SearchResults({ id, loading, matches, selectedId, onSelect }: { id: string; loading: boolean; matches: Home[]; selectedId: Id<"households"> | null; onSelect: (id: Id<"households">) => void }) {
  const shown = matches.slice(0, 50);
  return <div id={id} className="border-t border-panel-raised">
    <p className="type-small px-3 py-2 text-on-panel-muted" role="status">{loading ? "Loading households…" : matches.length === 0 ? "No matching households. Try another name or street." : `${matches.length} ${matches.length === 1 ? "household" : "households"} found${matches.length > 50 ? " — showing the first 50; narrow your search" : ""}`}</p>
    <ul className="max-h-64 overflow-y-auto">{shown.map(home => <li key={home._id}><button type="button" onClick={() => onSelect(home._id)} aria-label={`Open ${displayName(home.residentName)} at ${displayAddress(home.address)}`} className={`flex w-full items-start gap-2 border-t border-panel-raised px-3 py-3 text-left hover:bg-panel-raised focus-visible:bg-panel-raised focus-visible:outline-none ${selectedId === home._id ? "bg-panel-raised" : ""}`}><User className="mt-0.5 size-4 shrink-0 text-on-panel-muted" aria-hidden /><span className="min-w-0 flex-1"><span className="type-small block truncate font-semibold">{displayName(home.residentName)}</span><span className="type-small block truncate text-on-panel-muted">{displayAddress(home.address)}</span></span><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /></button></li>)}</ul>
  </div>;
}
