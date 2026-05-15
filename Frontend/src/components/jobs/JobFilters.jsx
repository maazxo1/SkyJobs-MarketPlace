import { useState } from 'react';
import Button from '../common/Button';

const EMPTY = { search: '', category_id: '', budget_min: '', budget_max: '', location: '' };

const JobFilters = ({ categories = [], onFilter }) => {
  const [filters, setFilters] = useState(EMPTY);

  const handleChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCategoryToggle = (id) => {
    const next = { ...filters, category_id: filters.category_id === String(id) ? '' : String(id) };
    setFilters(next);
    onFilter(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onFilter(filters);
  };

  const handleReset = () => {
    setFilters(EMPTY);
    onFilter(EMPTY);
  };

  const hasActive = Object.values(filters).some(Boolean);

  return (
    <div className="bg-surface border border-[var(--border)] rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-sm font-bold font-display text-ink">Filters</h3>
        {hasActive && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-accent hover:text-accent-deep transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">

        {/* Search */}
        <div>
          <label className="block overline mb-2">Keywords</label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              name="search"
              value={filters.search}
              onChange={handleChange}
              placeholder="Search jobs…"
              className="field pl-8 text-sm"
            />
          </div>
        </div>

        {/* Categories — pill chips */}
        {categories.length > 0 && (
          <div>
            <label className="block overline mb-2">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => {
                const active = filters.category_id === String(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategoryToggle(c.id)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      active
                        ? 'bg-accent text-white border-transparent'
                        : 'bg-page text-ink-2 border-[var(--border)] hover:border-[var(--accent)] hover:text-accent'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Budget */}
        <div>
          <label className="block overline mb-2">Budget ($)</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="budget_min"
              value={filters.budget_min}
              onChange={handleChange}
              placeholder="Min"
              className="field text-sm"
            />
            <input
              type="number"
              name="budget_max"
              value={filters.budget_max}
              onChange={handleChange}
              placeholder="Max"
              className="field text-sm"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block overline mb-2">Location</label>
          <input
            name="location"
            value={filters.location}
            onChange={handleChange}
            placeholder="Remote, New York…"
            className="field text-sm"
          />
        </div>

        <Button type="submit" className="w-full" size="md">Apply Filters</Button>
      </form>
    </div>
  );
};

export default JobFilters;
