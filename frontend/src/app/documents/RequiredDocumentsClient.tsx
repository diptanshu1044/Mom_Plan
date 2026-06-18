"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ExternalLink,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  FileText,
  Star,
  Loader2,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { filterStatesByCodes, STATE_LABEL_BY_CODE } from "@/lib/us-states";

interface DocumentItem {
  name: string;
  note?: string;
}

interface ChecklistProgram {
  id: string;
  name: string;
  shortName: string;
  category: string;
  categoryColor: string;
  level: "Federal" | "State";
  isFederal: boolean;
  stateCode: string | null;
  description: string;
  eligibility: string[];
  mandatoryDocs: DocumentItem[];
  optionalDocs: DocumentItem[];
  officialUrl: string;
}

const LEVEL_TABS = ["All levels", "Federal", "State"];
const PAGE_SIZE = 10;

function buildChecklistParams(state: string, level: string, search: string, page: number) {
  const params = new URLSearchParams();
  if (state !== "All") params.set("state", state);
  if (level !== "All levels") params.set("level", level);
  if (search.trim()) params.set("search", search.trim());
  params.set("page", String(page));
  params.set("limit", String(PAGE_SIZE));
  return params;
}

function buildPageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages]);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }
  return [...pages].sort((a, b) => a - b);
}

type PaginationItem =
  | { type: "page"; page: number }
  | { type: "ellipsis"; gapId: string };

function buildPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  const pages = buildPageNumbers(currentPage, totalPages);
  const items: PaginationItem[] = [];

  pages.forEach((page, index) => {
    const prevPage = pages[index - 1];
    if (prevPage !== undefined && page - prevPage > 1) {
      items.push({ type: "ellipsis", gapId: `gap-${prevPage}-${page}` });
    }
    items.push({ type: "page", page });
  });

  return items;
}

function formatResultsRange(page: number, limit: number, total: number): string {
  if (total === 0) return "No schemes found";
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return `Showing ${start}–${end} of ${total} scheme${total === 1 ? "" : "s"}`;
}

export default function RequiredDocumentsPage() {
  const [availableStateCodes, setAvailableStateCodes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedState, setSelectedState] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All levels");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState("");
  const [openJumpGap, setOpenJumpGap] = useState<string | null>(null);
  const pageJumpInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const filtersKeyRef = useRef("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const filtersKey = `${selectedState}|${selectedLevel}|${debouncedSearch}`;
    if (filtersKeyRef.current !== filtersKey) {
      filtersKeyRef.current = filtersKey;
      setOpenJumpGap(null);
      setPageInput("");
      setCurrentPage(1);
    }
  }, [selectedState, selectedLevel, debouncedSearch]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.documentsChecklist(
      selectedState,
      selectedLevel,
      debouncedSearch,
      currentPage
    ),
    queryFn: async () => {
      const params = buildChecklistParams(
        selectedState,
        selectedLevel,
        debouncedSearch,
        currentPage
      );
      const response = await api.get(`/api/programs/documents-checklist?${params.toString()}`);
      if (!response.data.success) {
        throw new Error("Failed to fetch documents checklist");
      }
      return response.data.data as {
        programs: ChecklistProgram[];
        availableStates?: string[];
        total: number;
        pagination?: { totalPages: number; page: number };
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (data?.pagination?.page && data.pagination.page !== currentPage) {
      setCurrentPage(data.pagination.page);
    }
  }, [data?.pagination?.page, currentPage]);

  useEffect(() => {
    if (data?.availableStates?.length) {
      setAvailableStateCodes(data.availableStates);
    }
  }, [data?.availableStates]);

  useEffect(() => {
    if (openJumpGap) {
      pageJumpInputRef.current?.focus();
    }
  }, [openJumpGap]);

  const displayedPrograms = data?.programs ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;
  const availableStates = filterStatesByCodes(availableStateCodes);
  const showInitialLoader = isLoading && displayedPrograms.length === 0;
  const showFilterOverlay = isFetching && !isLoading && displayedPrograms.length > 0;
  const paginationItems = buildPaginationItems(currentPage, totalPages);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setOpenJumpGap(null);
    setPageInput("");
    setExpandedId(null);
    setCurrentPage(page);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openPageJump = (gapId: string) => {
    setOpenJumpGap(gapId);
    setPageInput("");
  };

  const closePageJump = () => {
    setOpenJumpGap(null);
    setPageInput("");
  };

  const submitPageJump = () => {
    const parsed = Number.parseInt(pageInput, 10);
    if (!Number.isFinite(parsed)) {
      closePageJump();
      return;
    }
    const clamped = Math.min(Math.max(1, parsed), totalPages);
    if (clamped === currentPage) {
      closePageJump();
      return;
    }
    goToPage(clamped);
  };

  const handlePageJumpKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitPageJump();
    }
    if (event.key === "Escape") {
      closePageJump();
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-surface pb-20 pt-16">
        <div className="bg-gradient-primary text-white pt-24 pb-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold mb-5 border border-white/20">
              <FileText className="w-3.5 h-3.5" />
              Documents checklist
            </div>
            <h1 className="font-display font-bold text-4xl md:text-5xl mb-4 leading-tight">
              Required Documents by Scheme
            </h1>
            <p className="text-indigo-100 text-base max-w-2xl leading-relaxed">
              Pick your state to see the schemes available to you, who qualifies, and exactly which documents you&apos;ll need — clearly marked as required or optional.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 -mt-8">
          <div className="bg-white rounded-2xl shadow-xl border border-outline-variant/20 p-4 flex flex-col sm:flex-row gap-3 items-stretch">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 w-4 h-4" />
              <input
                type="text"
                placeholder="Search scheme or document..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm text-on-surface transition-all"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 w-4 h-4" />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="pl-9 pr-8 py-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm text-on-surface transition-all appearance-none min-w-[160px]"
              >
                <option value="All">All states</option>
                {availableStates.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-4 mb-6">
            {LEVEL_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedLevel(tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  selectedLevel === tab
                    ? "bg-primary border-primary text-white shadow-primary"
                    : "bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {tab}
              </button>
            ))}
            <span className="ml-auto text-sm text-on-surface-variant self-center flex items-center gap-2">
              {showFilterOverlay && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {showFilterOverlay
                ? "Updating results..."
                : formatResultsRange(currentPage, PAGE_SIZE, total)}
            </span>
          </div>

          <div className="hidden md:grid grid-cols-[2fr_0.7fr_1.5fr_2fr_0.5fr] gap-4 px-4 py-2 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/30 mb-2">
            <span>Scheme</span>
            <span>Level</span>
            <span>Eligibility</span>
            <span>Required Documents</span>
            <span>Link</span>
          </div>

          <div ref={resultsRef} className="space-y-3 pb-20 relative">
            {showInitialLoader ? (
              <div className="flex items-center justify-center py-20 text-on-surface-variant">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading schemes...
              </div>
            ) : (
              <>
                {showFilterOverlay && (
                  <div className="absolute inset-0 z-10 flex items-start justify-center pt-24 bg-white/60 backdrop-blur-[1px] rounded-2xl pointer-events-none">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/30 rounded-full shadow-sm text-sm text-on-surface-variant">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Updating results...
                    </div>
                  </div>
                )}
                <AnimatePresence mode="popLayout">
                  {displayedPrograms.map((program) => {
                  const isExpanded = expandedId === program.id;
                  return (
                    <motion.div
                      key={program.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: showFilterOverlay ? 0.6 : 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden"
                    >
                      <div className="md:grid md:grid-cols-[2fr_0.7fr_1.5fr_2fr_0.5fr] gap-4 p-4 items-start">
                        <div>
                          <div className="flex items-start gap-2 flex-wrap mb-1.5">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : program.id)}
                              className="font-bold text-sm text-on-surface hover:text-primary transition-colors text-left"
                            >
                              {program.name}
                            </button>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${program.categoryColor}`}>
                              {program.category}
                            </span>
                            {!program.isFederal && program.stateCode && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                {STATE_LABEL_BY_CODE[program.stateCode.toUpperCase()] || program.stateCode}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">{program.description}</p>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : program.id)}
                            className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary-600 font-medium md:hidden"
                          >
                            {isExpanded ? "Show less" : "Show details"}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        </div>

                        <div className="hidden md:block">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${program.level === "Federal" ? "bg-primary-50 text-primary-700 border border-primary-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
                            {program.level}
                          </span>
                        </div>

                        <div className="hidden md:block space-y-1">
                          {program.eligibility.length > 0 ? (
                            program.eligibility.map((item, i) => (
                              <div key={i} className="flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span className="text-xs text-on-surface-variant leading-snug">{item}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-on-surface-variant">See official site for eligibility details.</span>
                          )}
                        </div>

                        <div className="hidden md:block">
                          {program.mandatoryDocs.length > 0 && (
                            <div className="mb-2">
                              <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">
                                MANDATORY ({program.mandatoryDocs.length})
                              </span>
                              <ul className="mt-1 space-y-0.5">
                                {program.mandatoryDocs.map((doc, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-xs text-on-surface">
                                    <span className="text-rose-400 mt-0.5 shrink-0">•</span>
                                    <span>
                                      {doc.name}
                                      {doc.note && <span className="text-on-surface-variant"> ({doc.note})</span>}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {program.optionalDocs.length > 0 && (
                            <div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                OPTIONAL ({program.optionalDocs.length})
                              </span>
                              <ul className="mt-1 space-y-0.5">
                                {program.optionalDocs.map((doc, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                                    <span className="mt-0.5 shrink-0">•</span>
                                    <span>
                                      {doc.name}
                                      {doc.note && <span> ({doc.note})</span>}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {program.mandatoryDocs.length === 0 && program.optionalDocs.length === 0 && (
                            <span className="text-xs text-on-surface-variant">No document list available yet.</span>
                          )}
                        </div>

                        <div className="hidden md:flex items-start justify-center pt-1">
                          {program.officialUrl ? (
                            <a
                              href={program.officialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col items-center gap-1 text-primary hover:text-primary-600 transition-colors group"
                              title="Official site"
                            >
                              <div className="w-8 h-8 rounded-lg bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
                                <ExternalLink className="w-4 h-4" />
                              </div>
                              <span className="text-[10px] font-bold">Official site</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-on-surface-variant">N/A</span>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="md:hidden overflow-hidden"
                          >
                            <div className="px-4 pb-4 border-t border-outline-variant/10 pt-4 space-y-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${program.level === "Federal" ? "bg-primary-50 text-primary-700 border border-primary-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
                                  {program.level}
                                </span>
                                {!program.isFederal && program.stateCode && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    {STATE_LABEL_BY_CODE[program.stateCode.toUpperCase()] || program.stateCode}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-2">Eligibility</div>
                                <div className="space-y-1">
                                  {program.eligibility.length > 0 ? (
                                    program.eligibility.map((item, i) => (
                                      <div key={i} className="flex items-start gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                        <span className="text-xs text-on-surface-variant">{item}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-xs text-on-surface-variant">See official site for eligibility details.</span>
                                  )}
                                </div>
                              </div>
                              {program.mandatoryDocs.length > 0 && (
                                <div>
                                  <div className="text-[10px] font-black text-rose-600 uppercase tracking-wider mb-2">MANDATORY ({program.mandatoryDocs.length})</div>
                                  <ul className="space-y-1">
                                    {program.mandatoryDocs.map((doc, i) => (
                                      <li key={i} className="flex items-start gap-1.5 text-xs text-on-surface">
                                        <span className="text-rose-400 mt-0.5 shrink-0">•</span>
                                        <span>{doc.name}{doc.note && <span className="text-on-surface-variant"> ({doc.note})</span>}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {program.optionalDocs.length > 0 && (
                                <div>
                                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">OPTIONAL ({program.optionalDocs.length})</div>
                                  <ul className="space-y-1">
                                    {program.optionalDocs.map((doc, i) => (
                                      <li key={i} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                                        <span className="mt-0.5 shrink-0">•</span>
                                        <span>{doc.name}{doc.note && <span> ({doc.note})</span>}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {program.officialUrl && (
                                <a
                                  href={program.officialUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 w-full justify-center py-2.5 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl text-primary font-bold text-sm transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Official Site
                                </a>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </>
            )}

            {!showInitialLoader && !isFetching && displayedPrograms.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-on-surface-variant/30" />
                </div>
                <h3 className="font-bold text-lg text-on-surface mb-1">No schemes found</h3>
                <p className="text-on-surface-variant text-sm">Try adjusting your search or filter.</p>
              </div>
            )}
          </div>

          {!showInitialLoader && totalPages > 1 && (
            <nav
              className="mt-6 mb-24 flex items-center justify-center gap-2 flex-wrap"
              aria-label="Documents checklist pagination"
            >
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || isFetching}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-outline-variant/30 bg-white text-sm font-semibold text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {paginationItems.map((item) => {
                  if (item.type === "page") {
                    return (
                      <button
                        key={`page-${item.page}`}
                        type="button"
                        onClick={() => goToPage(item.page)}
                        disabled={isFetching}
                        aria-current={item.page === currentPage ? "page" : undefined}
                        className={`min-w-10 h-10 rounded-xl text-sm font-semibold border transition-colors ${
                          item.page === currentPage
                            ? "bg-primary border-primary text-white shadow-primary"
                            : "bg-white border-outline-variant/30 text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {item.page}
                      </button>
                    );
                  }

                  if (openJumpGap === item.gapId) {
                    return (
                      <input
                        key={item.gapId}
                        ref={pageJumpInputRef}
                        type="number"
                        min={1}
                        max={totalPages}
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        onKeyDown={handlePageJumpKeyDown}
                        onBlur={submitPageJump}
                        disabled={isFetching}
                        aria-label="Enter page number"
                        placeholder="Page"
                        className="w-14 h-10 px-2 rounded-xl border border-primary bg-white text-sm text-on-surface text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    );
                  }

                  return (
                    <button
                      key={item.gapId}
                      type="button"
                      onClick={() => openPageJump(item.gapId)}
                      disabled={isFetching}
                      aria-label="Jump to page"
                      title="Jump to page"
                      className="min-w-10 h-10 rounded-xl text-sm font-semibold border border-outline-variant/30 bg-white text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                    >
                      …
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || isFetching}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-outline-variant/30 bg-white text-sm font-semibold text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </nav>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-outline-variant/20 px-4 py-3 flex items-center justify-between max-w-5xl mx-auto z-40">
          <p className="text-xs text-on-surface-variant">
            <span className="font-bold text-on-surface">Ready to find your matches?</span> Run our AI eligibility scan to get personalized results.
          </p>
          <Link
            href="/eligibility"
            className="flex items-center gap-2 px-5 py-2 bg-gradient-primary text-white text-sm font-bold rounded-xl shadow-primary hover:shadow-primary-lg hover:-translate-y-0.5 transition-all shrink-0"
          >
            <Star className="w-4 h-4" />
            Check Eligibility
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
