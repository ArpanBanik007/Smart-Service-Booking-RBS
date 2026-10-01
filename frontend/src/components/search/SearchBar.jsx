import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiX } from "react-icons/fi";
import apiClient from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import SearchSuggestions from "./SearchSuggestions.jsx";

export default function SearchBar({
  placeholder = "Search AC mechanic, PC repair, electrician, cleaning...",
  initialValue = "",
  className = "",
  inputClassName = "",
  autoFocus = false,
  onSearchSubmit = null,
}) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState({ services: [], providers: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const navigate = useNavigate();

  // Sync initialValue if changed from parent
  useEffect(() => {
    setQuery(initialValue || "");
  }, [initialValue]);

  // Fetch suggestions with debounce
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions({ services: [], providers: [] });
      setIsOpen(false);
      setLoading(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(ENDPOINTS.SERVICES.SUGGESTIONS, {
          params: { q: trimmed },
        });
        const data = res.data?.data || { services: [], providers: [] };
        setSuggestions(data);
        setIsOpen(true);
      } catch (err) {
        console.error("Suggestion fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const totalSuggestions =
    (suggestions?.services?.length || 0) + (suggestions?.providers?.length || 0);

  const executeSearch = (searchQuery) => {
    const q = (searchQuery || query).trim();
    setIsOpen(false);
    setSelectedIndex(-1);

    if (onSearchSubmit) {
      onSearchSubmit(q);
      return;
    }

    if (!q) {
      navigate("/providers");
    } else {
      navigate(`/providers?search=${encodeURIComponent(q)}`);
    }
  };

  const handleSelectService = (service) => {
    setIsOpen(false);
    setSelectedIndex(-1);
    if (service?._id) {
      navigate(`/book/${service._id}`);
    }
  };

  const handleSelectProvider = (provider) => {
    setIsOpen(false);
    setSelectedIndex(-1);
    if (provider?._id) {
      navigate(`/providers/${provider._id}`);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen || totalSuggestions === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        executeSearch(query);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < totalSuggestions ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalSuggestions - 1));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSelectedIndex(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < totalSuggestions) {
        const services = suggestions.services || [];
        if (selectedIndex < services.length) {
          handleSelectService(services[selectedIndex]);
        } else {
          const providerIndex = selectedIndex - services.length;
          handleSelectProvider(suggestions.providers[providerIndex]);
        }
      } else {
        executeSearch(query);
      }
    }
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions({ services: [], providers: [] });
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          executeSearch(query);
        }}
        className="relative flex w-full items-center"
      >
        <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className={`w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 ${inputClassName}`}
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
            title="Clear search"
          >
            <FiX className="text-xs" />
          </button>
        )}
      </form>

      {isOpen && (
        <SearchSuggestions
          suggestions={suggestions}
          loading={loading}
          query={query}
          selectedIndex={selectedIndex}
          onSelectService={handleSelectService}
          onSelectProvider={handleSelectProvider}
          onSubmitSearch={executeSearch}
          dropdownRef={dropdownRef}
        />
      )}
    </div>
  );
}
