'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { filterStatesByCodes } from '@/lib/us-states';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ExternalLink, Info, CheckCircle, X, Loader2, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

interface BenefitProgram {
  id: string;
  name: string;
  agency: string;
  program_type: string;
  federal_or_state: string;
  state_code?: string;
  estimated_monthly_value_min?: number;
  estimated_monthly_value_max?: number;
  description: string;
  benefit: string | null;
  website: string;
  application_url: string;
  contact_email?: string;
  tags: string[];
  eligibility_criteria: Record<string, unknown>;
}

const CATEGORIES = [
  'All',
  'Food',
  'Cash',
  'Housing',
  'Childcare',
  'Healthcare',
  'Education',
  'Utilities'
];

const LEVEL_TABS = ['All levels', 'Federal', 'State'];
const PAGE_SIZE = 15;

function buildProgramsParams(
  state: string,
  level: string,
  category: string,
  search: string,
  page: number
) {
  const params = new URLSearchParams();
  if (state !== 'All') params.set('state', state);
  if (level !== 'All levels') params.set('level', level);
  if (category !== 'All') params.set('type', category);
  if (search.trim()) params.set('search', search.trim());
  params.set('page', String(page));
  params.set('limit', String(PAGE_SIZE));
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
  | { type: 'page'; page: number }
  | { type: 'ellipsis'; gapId: string };

function buildPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  const pages = buildPageNumbers(currentPage, totalPages);
  const items: PaginationItem[] = [];

  pages.forEach((page, index) => {
    const prevPage = pages[index - 1];
    if (prevPage !== undefined && page - prevPage > 1) {
      items.push({ type: 'ellipsis', gapId: `gap-${prevPage}-${page}` });
    }
    items.push({ type: 'page', page });
  });

  return items;
}

function formatResultsRange(page: number, limit: number, total: number): string {
  if (total === 0) return 'No programs found';
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return `Showing ${start}–${end} of ${total} program${total === 1 ? '' : 's'}`;
}

function formatBenefit(program: BenefitProgram): string {
  if (program.benefit) return program.benefit;
  const min = program.estimated_monthly_value_min;
  const max = program.estimated_monthly_value_max;
  if (min != null && max != null) {
    return min === max ? `$${min}/mo` : `$${min}–$${max}/mo`;
  }
  return 'Varies';
}

export default function BrowsePrograms() {
  const [availableStateCodes, setAvailableStateCodes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProgram, setSelectedProgram] = useState<BenefitProgram | null>(null);
  const [selectedState, setSelectedState] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All levels');
  const [pageInput, setPageInput] = useState('');
  const [openJumpGap, setOpenJumpGap] = useState<string | null>(null);
  const pageJumpInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const filtersKeyRef = useRef('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const filtersKey = `${selectedState}|${selectedLevel}|${selectedCategory}|${debouncedSearch}`;
    if (filtersKeyRef.current !== filtersKey) {
      filtersKeyRef.current = filtersKey;
      setOpenJumpGap(null);
      setPageInput('');
      setCurrentPage(1);
    }
  }, [selectedState, selectedLevel, selectedCategory, debouncedSearch]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.programs(
      selectedState,
      selectedLevel,
      selectedCategory,
      debouncedSearch,
      currentPage
    ),
    queryFn: async () => {
      const params = buildProgramsParams(
        selectedState,
        selectedLevel,
        selectedCategory,
        debouncedSearch,
        currentPage
      );
      const response = await api.get(`/api/programs?${params.toString()}`);
      if (!response.data.success) {
        throw new Error('Failed to fetch programs');
      }
      return response.data.data as {
        programs: BenefitProgram[];
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

  const programs = data?.programs ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;
  const availableStates = filterStatesByCodes(availableStateCodes);
  const showInitialLoader = isLoading && programs.length === 0;
  const showFilterOverlay = isFetching && !isLoading && programs.length > 0;
  const paginationItems = buildPaginationItems(currentPage, totalPages);
  const filterLoading = isFetching;

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setOpenJumpGap(null);
    setPageInput('');
    setCurrentPage(page);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openPageJump = (gapId: string) => {
    setOpenJumpGap(gapId);
    setPageInput('');
  };

  const closePageJump = () => {
    setOpenJumpGap(null);
    setPageInput('');
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

  const handlePageJumpKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitPageJump();
    }
    if (event.key === 'Escape') {
      closePageJump();
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-surface pb-20 pt-16">
        <div className="bg-gradient-primary text-white pt-24 pb-16 px-6">
          <div className="max-w-7xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold font-plus-jakarta mb-4"
            >
              Government Benefit Programs
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-primary-100 max-w-2xl"
            >
              Discover and browse government assistance programs. We&apos;ve compiled the most critical resources for mothers and families in one place.
            </motion.p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 -mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-white/20 flex flex-col md:flex-row gap-4 items-center"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search programs, e.g. 'rent', 'childcare', 'food'..."
                className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all text-on-surface"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative w-full md:w-56 shrink-0">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 w-4 h-4 pointer-events-none" />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all text-on-surface font-semibold text-sm appearance-none cursor-pointer"
              >
                <option value="All">All states</option>
                {availableStates.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            <div className="flex gap-2 items-center overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-primary-500 text-white shadow-primary'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-outline-variant/30'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="flex gap-2 mt-4 mb-2 flex-wrap">
            {LEVEL_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedLevel(tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  selectedLevel === tab
                    ? 'bg-primary border-primary text-white shadow-primary'
                    : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {tab}
              </button>
            ))}
            <span className="ml-auto text-sm text-on-surface-variant self-center flex items-center gap-2">
              {showFilterOverlay && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {showFilterOverlay
                ? 'Updating results...'
                : formatResultsRange(currentPage, PAGE_SIZE, total)}
            </span>
          </div>

          <div ref={resultsRef} className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
            {showInitialLoader ? (
              <div className="col-span-full flex items-center justify-center py-20 text-on-surface-variant">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading programs...
              </div>
            ) : (
              <>
                {showFilterOverlay && (
                  <div className="absolute inset-0 z-10 flex items-start justify-center pt-24 bg-white/60 backdrop-blur-[1px] rounded-2xl pointer-events-none col-span-full">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/30 rounded-full shadow-sm text-sm text-on-surface-variant">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Updating results...
                    </div>
                  </div>
                )}
                <AnimatePresence mode="popLayout">
                  {programs.length > 0 ? (
                    programs.map((program, index) => (
                      <motion.div
                        key={program.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: showFilterOverlay ? 0.6 : 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05 }}
                        className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                      >
                        <div className="p-6 flex-1">
                          <div className="flex justify-between items-start mb-4">
                            <span className="px-3 py-1 bg-primary-50 text-primary-600 text-xs font-bold rounded-full uppercase tracking-wider">
                              {program.program_type}
                            </span>
                            <span className="text-xs text-on-surface-variant/70 font-medium">{program.agency}</span>
                          </div>
                          <h3 className="text-xl font-bold text-on-surface mb-3 group-hover:text-primary-500 transition-colors line-clamp-2">
                            {program.name}
                          </h3>
                          <p className="text-slate-600 text-sm mb-6 line-clamp-3 leading-relaxed">
                            {program.description}
                          </p>

                          <div className="bg-slate-50 rounded-xl p-4 mb-6">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Benefit</p>
                            <p className="text-lg font-bold text-primary-600">
                              {formatBenefit(program)}
                            </p>
                          </div>
                        </div>

                        <div className="p-6 pt-0 mt-auto flex flex-col gap-3">
                          <button
                            onClick={() => setSelectedProgram(program)}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all"
                          >
                            <Info className="w-4 h-4" />
                            Eligibility Criteria
                          </button>
                          <a
                            href={program.application_url || program.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3 bg-on-surface text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg"
                          >
                            Learn how to apply
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    !filterLoading && (
                      <div className="col-span-full py-20 text-center">
                        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="text-slate-400 w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">No programs found</h3>
                        <p className="text-slate-500">Try adjusting your filters or search terms.</p>
                      </div>
                    )
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          {!showInitialLoader && totalPages > 1 && (
            <nav
              className="mt-10 flex items-center justify-center gap-2 flex-wrap"
              aria-label="Programs pagination"
            >
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || filterLoading}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-outline-variant/30 bg-white text-sm font-semibold text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {paginationItems.map((item) => {
                  if (item.type === 'page') {
                    return (
                      <button
                        key={`page-${item.page}`}
                        type="button"
                        onClick={() => goToPage(item.page)}
                        disabled={filterLoading}
                        aria-current={item.page === currentPage ? 'page' : undefined}
                        className={`min-w-10 h-10 rounded-xl text-sm font-semibold border transition-colors ${
                          item.page === currentPage
                            ? 'bg-primary border-primary text-white shadow-primary'
                            : 'bg-white border-outline-variant/30 text-on-surface hover:bg-surface-container'
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
                        disabled={filterLoading}
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
                      disabled={filterLoading}
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
                disabled={currentPage === totalPages || filterLoading}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-outline-variant/30 bg-white text-sm font-semibold text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </nav>
          )}
        </div>

        <AnimatePresence>
          {selectedProgram && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedProgram(null)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl max-h-[90vh] flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-3xl">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedProgram.name}</h2>
                    <p className="text-slate-500 text-sm">Eligibility Requirements</p>
                  </div>
                  <button
                    onClick={() => setSelectedProgram(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="p-8 overflow-y-auto">
                  <div className="space-y-8">
                    <section>
                      <h4 className="text-xs font-bold text-primary-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <div className="w-1 h-4 bg-primary-500 rounded-full" />
                        General Requirements
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(selectedProgram.eligibility_criteria || {}).map(([key, value]) => {
                          if (typeof value === 'boolean') {
                            return (
                              <div key={key} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                {value ? (
                                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0" />
                                )}
                                <span className="text-sm font-medium text-slate-700 capitalize">
                                  {key.replace(/_/g, ' ')}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </section>

                    <section>
                      <h4 className="text-xs font-bold text-primary-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <div className="w-1 h-4 bg-primary-500 rounded-full" />
                        Specific Criteria
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(selectedProgram.eligibility_criteria || {}).map(([key, value]) => {
                          if (typeof value !== 'boolean' && value !== null) {
                            return (
                              <div key={key} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-tight capitalize">{key.replace(/_/g, ' ')}</span>
                                <span className="text-sm font-semibold text-slate-900">{String(value)}</span>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </section>

                    {selectedProgram.contact_email && (
                      <section>
                        <h4 className="text-xs font-bold text-primary-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <div className="w-1 h-4 bg-primary-500 rounded-full" />
                          Official Contact
                        </h4>
                        <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                          <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Contact Email</span>
                          <span className="text-sm font-semibold text-slate-900 font-mono">{selectedProgram.contact_email}</span>
                        </div>
                      </section>
                    )}

                    <div className="p-6 bg-primary-50 rounded-3xl border border-primary-100 flex gap-4">
                      <div className="bg-white p-2 rounded-xl shadow-sm self-start">
                        <Info className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <h5 className="font-bold text-primary-900 mb-1">Apply via Scan</h5>
                        <p className="text-sm text-primary-700 leading-relaxed">
                          Don&apos;t want to check manually? Use our <strong>AI Eligibility Scan</strong> to automatically determine your qualification for this and other programs in seconds.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-surface-container-low border-t border-outline-variant/20 rounded-b-3xl">
                  <a
                    href={selectedProgram.application_url || selectedProgram.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 bg-primary-500 text-white rounded-2xl font-bold hover:shadow-primary-lg transition-all"
                  >
                    Start Official Application
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </>
  );
}
