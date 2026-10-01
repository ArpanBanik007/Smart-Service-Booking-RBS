import { FiTool, FiUserCheck, FiStar, FiChevronRight, FiSearch } from "react-icons/fi";

export default function SearchSuggestions({
  suggestions,
  loading,
  query,
  selectedIndex,
  onSelectService,
  onSelectProvider,
  onSubmitSearch,
  dropdownRef,
}) {
  const services = suggestions?.services || [];
  const providers = suggestions?.providers || [];
  const totalItems = services.length + providers.length;

  if (!query || query.trim().length === 0) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 right-0 top-full z-[1050] mt-2 max-h-[460px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl backdrop-blur"
      role="listbox"
    >
      {loading && totalItems === 0 && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span>Searching services & providers...</span>
        </div>
      )}

      {!loading && totalItems === 0 && (
        <div className="py-4 text-center">
          <p className="text-sm font-medium text-slate-700">
            No exact matches for &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Press Enter to explore all matching providers & services
          </p>
          <button
            type="button"
            onClick={() => onSubmitSearch(query)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            <FiSearch className="text-xs" /> Search &ldquo;{query}&rdquo;
          </button>
        </div>
      )}

      {/* Services Section */}
      {services.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1">
              <FiTool className="text-indigo-600" /> Services ({services.length})
            </span>
          </div>
          <div className="space-y-1">
            {services.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <button
                  key={item._id || idx}
                  type="button"
                  onClick={() => onSelectService(item)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition ${
                    isSelected
                      ? "bg-indigo-50 text-indigo-900"
                      : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {item.title}
                      </p>
                      {item.category?.name && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {item.category.name}
                        </span>
                      )}
                    </div>
                    {item.provider?.businessName && (
                      <p className="truncate text-xs text-slate-500">
                        by {item.provider.businessName}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold text-indigo-600">
                      ₹{item.price}
                    </span>
                    <FiChevronRight className="text-xs text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Providers Section */}
      {providers.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between border-t border-slate-100 px-3 pt-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1">
              <FiUserCheck className="text-emerald-600" /> Providers ({providers.length})
            </span>
          </div>
          <div className="space-y-1">
            {providers.map((p, idx) => {
              const itemIndex = services.length + idx;
              const isSelected = selectedIndex === itemIndex;
              return (
                <button
                  key={p._id || idx}
                  type="button"
                  onClick={() => onSelectProvider(p)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition ${
                    isSelected
                      ? "bg-emerald-50 text-emerald-900"
                      : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {p.businessName}
                      </p>
                      {p.isVerified && (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1 text-amber-500 font-semibold">
                        <FiStar className="fill-amber-400 text-amber-400 text-[11px]" />
                        {p.ratings?.average ? Number(p.ratings.average).toFixed(1) : "5.0"}
                      </span>
                      {p.categories?.length > 0 && (
                        <span className="truncate">
                          • {p.categories.map((c) => c.name || c).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {p.startingPrice > 0 ? (
                      <span className="text-xs font-semibold text-slate-600">
                        from ₹{p.startingPrice}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-emerald-600">
                        Available
                      </span>
                    )}
                    <FiChevronRight className="text-xs text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer / Search All Action */}
      <div className="border-t border-slate-100 pt-1.5">
        <button
          type="button"
          onClick={() => onSubmitSearch(query)}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
        >
          <span className="flex items-center gap-2">
            <FiSearch /> See all results for &ldquo;{query}&rdquo;
          </span>
          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-700">
            ↵ Enter
          </span>
        </button>
      </div>
    </div>
  );
}
