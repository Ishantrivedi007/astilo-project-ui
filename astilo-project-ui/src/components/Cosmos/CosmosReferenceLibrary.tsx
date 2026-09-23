import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, ExternalLink } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchAstronomyTopics, fetchResearchSummary, type AstronomyTopic } from "../../lib/cosmosApi";
import CosmosSourceBadge from "./CosmosSourceBadge";
import "./Cosmos.scss";

const TopicCard = ({ topic }: { topic: AstronomyTopic }) => {
  const [expanded, setExpanded] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ["cosmos", "reference-summary", topic.title],
    queryFn: () => fetchResearchSummary(topic.title),
    enabled: expanded,
    retry: false,
  });

  return (
    <div className="cosmos-card">
      <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setExpanded((v) => !v)}>
        <h3 className="text-sm font-bold">{topic.title}</h3>
        <ChevronRight size={16} style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {expanded && (
        <div className="mt-3">
          {summaryQuery.isLoading && <p className="text-sm text-white/60">Loading from Wikipedia…</p>}
          {summaryQuery.isError && <p className="cosmos-unavailable">Couldn't load this topic right now.</p>}
          {summaryQuery.data && (
            <>
              <div className="mb-2 flex items-center gap-2">
                <CosmosSourceBadge source="Wikipedia" />
                {summaryQuery.data.data.pageUrl && (
                  <a href={summaryQuery.data.data.pageUrl} target="_blank" rel="noreferrer" className="cosmos-chip">
                    <ExternalLink size={12} /> Full article
                  </a>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                {summaryQuery.data.data.thumbnailUrl && (
                  <img
                    src={summaryQuery.data.data.thumbnailUrl}
                    alt={topic.title}
                    loading="lazy"
                    className="h-full w-full rounded-lg object-cover"
                    style={{ maxHeight: 140 }}
                  />
                )}
                <p className={summaryQuery.data.data.extract ? "text-sm text-white/80" : "cosmos-unavailable"}>
                  {summaryQuery.data.data.extract || "No summary available for this topic."}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/** Real, live Wikipedia category membership — the topic list itself comes
 * from Wikipedia's current category data at request time, not anything
 * Astilo curates and freezes in code. */
const CosmosReferenceLibrary = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState("Astronomy");
  const [submitted, setSubmitted] = useState("Astronomy");

  const topicsQuery = useQuery({
    queryKey: ["cosmos", "astronomy-topics", submitted],
    queryFn: () => fetchAstronomyTopics(submitted, 30),
    retry: false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (category.trim()) setSubmitted(category.trim());
  };

  const results = topicsQuery.data?.data.results ?? [];
  const pages = results.filter((t) => !t.isCategory);
  const subcategories = results.filter((t) => t.isCategory);

  return (
    <div className="cosmos-page">
      <button type="button" className="cosmos-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.cosmos)}>
        <ArrowLeft size={12} /> Cosmos Home
      </button>

      <p className="cosmos-eyebrow">✦ Reference Library</p>
      <h1 className="cosmos-title" style={{ fontSize: "1.75rem" }}>
        Astronomy reference topics
      </h1>
      <p className="cosmos-tagline">
        Browses Wikipedia's own live category membership — real, current article titles, not a
        fixed list. Expand a card for a real sourced summary. This is separate from your{" "}
        <button type="button" className="cosmos-chip" onClick={() => navigate(AppRoute.cosmosLibrary)}>
          saved objects
        </button>
        .
      </p>

      <form className="cosmos-search-form" onSubmit={submit}>
        <input
          className="cosmos-search-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Wikipedia category — Astronomy, Observational astronomy…"
        />
      </form>
      <p className="mt-1 text-xs text-white/40">Category: {submitted}</p>

      {topicsQuery.isLoading && <p className="mt-6 text-sm text-white/60">Loading topics from Wikipedia…</p>}
      {topicsQuery.isError && <p className="mt-6 cosmos-unavailable">Couldn't load category "{submitted}".</p>}
      {topicsQuery.data && results.length === 0 && (
        <p className="mt-6 cosmos-unavailable">No Wikipedia category named "{submitted}" was found.</p>
      )}

      {subcategories.length > 0 && (
        <>
          <h2 className="cosmos-section-title">Subcategories</h2>
          <div className="cosmos-search-examples">
            {subcategories.map((sc) => (
              <button
                key={sc.title}
                type="button"
                className="cosmos-chip"
                onClick={() => {
                  setCategory(sc.title);
                  setSubmitted(sc.title);
                }}
              >
                {sc.title}
              </button>
            ))}
          </div>
        </>
      )}

      {pages.length > 0 && (
        <>
          <h2 className="cosmos-section-title">Topics</h2>
          <div className="cosmos-result-list">
            {pages.map((t) => (
              <TopicCard key={t.title} topic={t} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CosmosReferenceLibrary;
