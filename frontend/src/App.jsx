import { useEffect, useMemo, useState } from "react";
import "./App.css";

import {
  getReadiness,
  getRetailProduct,
  getTopProducts,
  loadExecutiveOverview,
  loadProductIntelligence,
  loadRecommendationIntelligence,
  loadCustomerIntelligence,
  getCustomers,
  getCustomer360,
} from "./services/api";

const NAV_ITEMS = [
  {
    id: "overview",
    label: "Overview",
    shortLabel: "Executive overview",
    icon: "overview",
  },
  {
    id: "products",
    label: "Product Intelligence",
    shortLabel: "Products & assortment",
    icon: "products",
  },
  {
    id: "recommendations",
    label: "Recommendation Intelligence",
    shortLabel: "ML recommendations",
    icon: "recommendations",
  },
  {
    id: "customers",
    label: "Customer Intelligence",
    shortLabel: "Behavior & personas",
    icon: "customers",
  },
  {
    id: "customer360",
    label: "Customer 360",
    shortLabel: "Unified customer view",
    icon: "customer360",
  },
];

const PAGE_META = {
  overview: {
    eyebrow: "EXECUTIVE VIEW",
    title: "Retail Intelligence Overview",
    description:
      "A single operating view across assortment performance, recommendation intelligence and customer behavior.",
  },
  products: {
    eyebrow: "ASSORTMENT",
    title: "Product Intelligence",
    description:
      "Understand demand, repeat behavior, portfolio segments and department performance.",
  },
  recommendations: {
    eyebrow: "MACHINE LEARNING",
    title: "Recommendation Intelligence",
    description:
      "Monitor recommendation scale, candidate sources, ranking quality and category coverage.",
  },
  customers: {
    eyebrow: "CUSTOMER ANALYTICS",
    title: "Customer Intelligence",
    description:
      "Explore shopping personas, behavioral signals, basket patterns and category affinities.",
  },
  customer360: {
    eyebrow: "UNIFIED CUSTOMER VIEW",
    title: "Customer 360",
    description:
      "Bring Shopping DNA, next-basket predictions, recommendation intelligence and reorder timing together for one customer.",
  },
};

function App() {
  const [activePage, setActivePage] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("retail-intelligence-theme");

    if (saved === "light" || saved === "dark") {
      return saved;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const [readiness, setReadiness] = useState(null);
  const [overview, setOverview] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("retail-intelligence-theme", theme);
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();

    async function bootstrapPlatform() {
      try {
        setLoading(true);
        setError("");

        const [readinessData, overviewData] = await Promise.all([
          getReadiness({ signal: controller.signal }),
          loadExecutiveOverview({ signal: controller.signal }),
        ]);

        setReadiness(readinessData);
        setOverview(overviewData);
      } catch (err) {
        if (err?.name === "AbortError") {
          return;
        }

        console.error(err);
        setError(
          err?.message ||
            "Unable to load Retail Intelligence. Make sure the FastAPI backend is running.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    bootstrapPlatform();

    return () => controller.abort();
  }, []);

  const activeMeta = PAGE_META[activePage];

  const statusLabel = useMemo(() => {
    if (loading) return "Connecting";
    if (error) return "API unavailable";

    if (
      readiness?.status === "ready" &&
      readiness?.database?.status === "connected"
    ) {
      return "Live data";
    }

    return "Check connection";
  }, [loading, error, readiness]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  return (
    <div
      className={`retail-platform ${sidebarOpen ? "" : "sidebar-collapsed"}`}
    >
      <aside className="platform-sidebar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            RI
          </div>

          <div className="brand-copy">
            <strong>Retail Intelligence</strong>
            <span>Instacart analytics platform</span>
          </div>
        </div>

        <nav className="platform-nav" aria-label="Primary navigation">
          <p className="nav-section-label">Workspace</p>

          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                activePage === item.id
                  ? "platform-nav-item active"
                  : "platform-nav-item"
              }
              onClick={() => setActivePage(item.id)}
            >
              <span className="platform-nav-icon">
                <NavIcon type={item.icon} />
              </span>

              <span className="platform-nav-copy">
                <strong>{item.label}</strong>
                <small>{item.shortLabel}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="data-status-card">
            <div
              className={`status-indicator ${
                error ? "offline" : loading ? "loading" : "online"
              }`}
            />

            <div>
              <strong>{statusLabel}</strong>
              <span>{readiness?.database?.provider || "Neon PostgreSQL"}</span>
            </div>
          </div>

          <button
            type="button"
            className="theme-switch"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            <strong>{theme === "dark" ? "☀" : "☾"}</strong>
          </button>
        </div>
      </aside>

      <section className="platform-workspace">
        <header className="platform-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setSidebarOpen((value) => !value)}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <span />
              <span />
              <span />
            </button>

            <div>
              <p className="page-eyebrow">{activeMeta.eyebrow}</p>
              <h1>{activeMeta.title}</h1>
            </div>
          </div>

          <div className="topbar-right">
            <div className="environment-badge">
              <span className="environment-dot" />
              Databricks Gold + Neon
            </div>

            <div className="topbar-avatar" aria-label="Retail Intelligence">
              RI
            </div>
          </div>
        </header>

        <main className="platform-content">
          <div className="page-intro">
            <p>{activeMeta.description}</p>
          </div>

          {error && (
            <section className="platform-alert error">
              <div className="platform-alert-icon">!</div>
              <div>
                <strong>Unable to load platform data</strong>
                <p>{error}</p>
              </div>
            </section>
          )}

          {loading ? (
            <PlatformLoading />
          ) : (
            <>
              {activePage === "overview" && (
                <ExecutiveOverview data={overview} />
              )}

              {activePage === "products" && <ProductIntelligencePage />}

              {activePage === "recommendations" && (
                <RecommendationIntelligencePage />
              )}

              {activePage === "customers" && <CustomerIntelligencePage />}

              {activePage === "customer360" && <Customer360Page />}
            </>
          )}
        </main>
      </section>
    </div>
  );
}

function ExecutiveOverview({ data }) {
  const retail = data?.retail || {};
  const recommendations = data?.recommendations || {};
  const customers = data?.customers || {};

  const kpis = [
    {
      label: "Products analyzed",
      value: formatCompact(retail.products_analyzed),
      detail: `${formatNumber(retail.departments_analyzed)} departments`,
      tone: "green",
    },
    {
      label: "Purchase events",
      value: formatCompact(retail.total_purchase_events),
      detail: `${formatNumber(retail.core_staples)} core staples`,
      tone: "blue",
    },
    {
      label: "Recommendations",
      value: formatCompact(recommendations.recommendations_generated),
      detail: `${formatNumber(recommendations.customers_served)} customers served`,
      tone: "violet",
    },
    {
      label: "Customers profiled",
      value: formatCompact(customers.customers_profiled),
      detail: "Shopping DNA coverage",
      tone: "amber",
    },
  ];

  return (
    <div className="overview-page">
      <section className="overview-hero">
        <div className="overview-hero-copy">
          <span className="hero-pill">Retail decision intelligence</span>

          <h2>
            From transaction data to
            <span> actionable retail decisions.</span>
          </h2>

          <p>
            The platform unifies Databricks Gold analytics, ML recommendation
            signals and customer behavioral intelligence in one management
            interface.
          </p>
        </div>

        <div className="overview-hero-highlight">
          <span>Top product</span>
          <strong>{retail.top_product?.name || "Banana"}</strong>
          <p>
            {formatCompact(retail.top_product?.purchase_count)} observed
            purchases
          </p>

          <div className="highlight-divider" />

          <span>Top department</span>
          <strong>{titleCase(retail.top_department?.name || "produce")}</strong>
          <p>
            {formatCompact(retail.top_department?.purchase_count)} purchase
            events
          </p>
        </div>
      </section>

      <section className="executive-kpi-grid">
        {kpis.map((kpi) => (
          <article key={kpi.label} className={`executive-kpi-card ${kpi.tone}`}>
            <div className="kpi-card-top">
              <span>{kpi.label}</span>
              <span className="kpi-mini-mark" />
            </div>

            <strong>{kpi.value}</strong>
            <p>{kpi.detail}</p>
          </article>
        ))}
      </section>

      <section className="overview-insight-grid">
        <article className="overview-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">ASSORTMENT SIGNAL</span>
              <h3>Core demand strength</h3>
            </div>
          </div>

          <div className="metric-feature">
            <strong>{formatPercent(retail.core_staple_repeat_rate_pct)}</strong>
            <span>Core-staple repeat rate</span>
          </div>

          <div className="metric-progress">
            <span
              style={{
                width: `${clampPercent(retail.core_staple_repeat_rate_pct)}%`,
              }}
            />
          </div>

          <p className="panel-note">
            High-demand, high-repeat products form the strategic base of the
            assortment.
          </p>
        </article>

        <article className="overview-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">RECOMMENDATION SIGNAL</span>
              <h3>Prediction confidence</h3>
            </div>
          </div>

          <div className="metric-feature">
            <strong>
              {formatPercent(recommendations.avg_purchase_probability_pct)}
            </strong>
            <span>Average recommendation probability</span>
          </div>

          <div className="metric-progress">
            <span
              style={{
                width: `${clampPercent(
                  recommendations.avg_purchase_probability_pct,
                )}%`,
              }}
            />
          </div>

          <p className="panel-note">
            Ranking performance and candidate-source quality will be explored in
            Recommendation Intelligence.
          </p>
        </article>

        <article className="overview-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">CUSTOMER SIGNAL</span>
              <h3>Shopping behavior</h3>
            </div>
          </div>

          <div className="mini-stat-list">
            <MiniStat
              label="Average basket size"
              value={formatNumber(customers.avg_basket_size, 1)}
            />
            <MiniStat
              label="Days between orders"
              value={formatNumber(customers.avg_days_between_orders, 1)}
            />
            <MiniStat
              label="Loyalty score"
              value={formatNumber(customers.behavior_scores?.loyalty, 1)}
            />
          </div>
        </article>
      </section>
    </div>
  );
}

function ProductIntelligencePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [topProducts, setTopProducts] = useState([]);
  const [topProductsLoading, setTopProductsLoading] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productDetail, setProductDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        const result = await loadProductIntelligence({
          limit: 10,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setData(result);

        const products = result?.topProducts?.products || [];
        setTopProducts(products);

        if (products.length > 0) {
          setSelectedProductId(products[0].product_id);
          setProductDetail(products[0]);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;

        console.error(err);
        setError(
          err?.message ||
            "Unable to load Product Intelligence from the Retail Gold serving layer.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => controller.abort();
  }, []);

  async function handleDepartmentChange(event) {
    const department = event.target.value;

    setDepartmentFilter(department);
    setTopProductsLoading(true);
    setDetailError("");

    try {
      const result = await getTopProducts({
        limit: 10,
        department: department || undefined,
      });

      const products = result?.products || [];
      setTopProducts(products);

      if (products.length > 0) {
        setSelectedProductId(products[0].product_id);
        setProductDetail(products[0]);
      } else {
        setSelectedProductId(null);
        setProductDetail(null);
      }
    } catch (err) {
      console.error(err);
      setDetailError(
        err?.message || "Unable to filter the top-product portfolio.",
      );
    } finally {
      setTopProductsLoading(false);
    }
  }

  async function handleProductSelect(product) {
    setSelectedProductId(product.product_id);
    setProductDetail(product);
    setDetailLoading(true);
    setDetailError("");

    try {
      const detail = await getRetailProduct(product.product_id);
      setProductDetail(detail);
    } catch (err) {
      console.error(err);
      setDetailError(err?.message || "Unable to refresh product detail.");
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="product-page-state">
        <PlatformLoading />
      </section>
    );
  }

  if (error) {
    return (
      <section className="platform-alert error product-page-alert">
        <div className="platform-alert-icon">!</div>
        <div>
          <strong>Unable to load Product Intelligence</strong>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  const overview = data?.overview || {};
  const segments = data?.segments?.segments || [];
  const departments = data?.departments?.departments || [];

  const coreSegment = segments.find(
    (segment) => segment.product_segment === "CORE STAPLE",
  );

  const maxProductPurchases = Math.max(
    1,
    ...topProducts.map((product) => Number(product.total_purchase_count) || 0),
  );

  const maxDepartmentPurchases = Math.max(
    1,
    ...departments.map(
      (department) => Number(department.total_purchase_count) || 0,
    ),
  );

  const kpis = [
    {
      label: "Products analyzed",
      value: formatCompact(overview.products_analyzed),
      detail: `${formatNumber(overview.departments_analyzed)} departments`,
      tone: "green",
    },
    {
      label: "Core staples",
      value: formatCompact(coreSegment?.product_count ?? overview.core_staples),
      detail: `${formatPercent(
        coreSegment?.avg_reorder_rate_pct ??
          overview.core_staple_repeat_rate_pct,
      )} avg reorder rate`,
      tone: "blue",
    },
    {
      label: "Highest customer reach",
      value: formatPercent(overview.highest_customer_reach_pct),
      detail: overview.top_product?.name || "Top-performing product",
      tone: "violet",
    },
    {
      label: "Core repeat rate",
      value: formatPercent(overview.core_staple_repeat_rate_pct),
      detail: "Strategic repeat-demand signal",
      tone: "amber",
    },
  ];

  return (
    <div className="product-intelligence-page">
      <section className="product-intelligence-hero">
        <div className="product-intelligence-hero-copy">
          <span className="hero-pill">Product intelligence</span>

          <h2>
            See where demand is concentrated and
            <span> which products deserve action.</span>
          </h2>

          <p>
            This view translates the Retail Gold product layer into assortment
            decisions using observed demand, customer reach, repeat behavior,
            portfolio segments and department performance.
          </p>
        </div>

        <div className="product-hero-signal">
          <span>Portfolio leader</span>
          <strong>{overview.top_product?.name || "Banana"}</strong>
          <p>
            {formatCompact(overview.top_product?.purchase_count)} observed
            purchases
          </p>

          <div className="highlight-divider" />

          <span>Strategic segment</span>
          <strong>Core Staple</strong>
          <p>{formatCompact(coreSegment?.product_count)} products to protect</p>
        </div>
      </section>

      <section className="executive-kpi-grid product-kpi-grid">
        {kpis.map((kpi) => (
          <article key={kpi.label} className={`executive-kpi-card ${kpi.tone}`}>
            <div className="kpi-card-top">
              <span>{kpi.label}</span>
              <span className="kpi-mini-mark" />
            </div>

            <strong>{kpi.value}</strong>
            <p>{kpi.detail}</p>
          </article>
        ))}
      </section>

      <section className="product-two-column-grid">
        <article className="product-panel product-leaders-panel">
          <div className="product-panel-heading product-panel-heading-with-control">
            <div>
              <span className="panel-kicker">DEMAND LEADERS</span>
              <h3>Top products by purchase volume</h3>
              <p>
                Rank the products creating the largest observed demand and
                compare their repeat behavior.
              </p>
            </div>

            <label className="department-filter-control">
              <span>Department</span>
              <select
                value={departmentFilter}
                onChange={handleDepartmentChange}
              >
                <option value="">All top departments</option>
                {departments.map((department) => (
                  <option
                    key={department.department}
                    value={department.department}
                  >
                    {titleCase(department.department)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="product-ranking-header" aria-hidden="true">
            <span>Product</span>
            <span>Purchases</span>
            <span>Reach</span>
            <span>Reorder</span>
          </div>

          <div
            className={`product-ranking-list ${topProductsLoading ? "is-loading" : ""}`}
          >
            {topProducts.map((product) => {
              const purchaseShare =
                ((Number(product.total_purchase_count) || 0) /
                  maxProductPurchases) *
                100;

              return (
                <button
                  type="button"
                  key={product.product_id}
                  className={
                    selectedProductId === product.product_id
                      ? "product-ranking-row selected"
                      : "product-ranking-row"
                  }
                  onClick={() => handleProductSelect(product)}
                >
                  <div className="product-ranking-identity">
                    <span className="product-rank-badge">
                      #{product.purchase_rank}
                    </span>
                    <div>
                      <strong>{product.product_name}</strong>
                      <small>
                        {titleCase(product.department)} ·{" "}
                        {formatSegment(product.product_segment)}
                      </small>
                    </div>
                  </div>

                  <div className="product-volume-cell">
                    <strong>
                      {formatCompact(product.total_purchase_count)}
                    </strong>
                    <div className="product-volume-track">
                      <span style={{ width: `${purchaseShare}%` }} />
                    </div>
                  </div>

                  <strong className="product-table-metric">
                    {formatPercent(product.customer_penetration_pct)}
                  </strong>

                  <strong className="product-table-metric">
                    {formatPercent(product.product_reorder_rate_pct)}
                  </strong>
                </button>
              );
            })}
          </div>

          {topProducts.length === 0 && (
            <div className="product-empty-state">
              No ranked products are available for this department.
            </div>
          )}
        </article>

        <article className="product-panel product-explorer-panel">
          <div className="product-panel-heading">
            <div>
              <span className="panel-kicker">PRODUCT EXPLORER</span>
              <h3>Business profile</h3>
              <p>
                Click any ranked product to inspect its Gold-layer decision
                signals.
              </p>
            </div>

            {detailLoading && (
              <span className="detail-loading-label">Refreshing…</span>
            )}
          </div>

          {productDetail ? (
            <ProductBusinessProfile product={productDetail} />
          ) : (
            <div className="product-empty-state">
              Select a product to open its business profile.
            </div>
          )}

          {detailError && <p className="product-inline-error">{detailError}</p>}
        </article>
      </section>

      <section className="product-panel segment-panel">
        <div className="product-panel-heading">
          <div>
            <span className="panel-kicker">PORTFOLIO STRATEGY</span>
            <h3>Product segments and management focus</h3>
            <p>
              The segmentation separates strategic staples, growth
              opportunities, low-traction products and items that still need
              more history.
            </p>
          </div>
        </div>

        <div className="segment-card-grid">
          {segments.map((segment) => (
            <SegmentCard
              key={segment.product_segment}
              segment={segment}
              totalProducts={overview.products_analyzed}
            />
          ))}
        </div>
      </section>

      <section className="product-panel department-panel">
        <div className="product-panel-heading">
          <div>
            <span className="panel-kicker">DEPARTMENT PERFORMANCE</span>
            <h3>Where purchase volume sits across the assortment</h3>
            <p>
              Compare the leading departments using total demand, average
              reorder behavior and average customer reach.
            </p>
          </div>
        </div>

        <div className="department-performance-list">
          {departments.map((department, index) => {
            const width =
              ((Number(department.total_purchase_count) || 0) /
                maxDepartmentPurchases) *
              100;

            return (
              <article
                className="department-performance-row"
                key={department.department}
              >
                <div className="department-rank">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="department-performance-main">
                  <div className="department-performance-topline">
                    <div>
                      <strong>{titleCase(department.department)}</strong>
                      <span>
                        {formatNumber(department.product_count)} products
                      </span>
                    </div>

                    <strong>
                      {formatCompact(department.total_purchase_count)}
                    </strong>
                  </div>

                  <div className="department-volume-track">
                    <span style={{ width: `${width}%` }} />
                  </div>
                </div>

                <div className="department-side-metric">
                  <span>Avg reorder</span>
                  <strong>
                    {formatPercent(department.avg_reorder_rate_pct)}
                  </strong>
                </div>

                <div className="department-side-metric">
                  <span>Avg reach</span>
                  <strong>
                    {formatPercent(department.avg_customer_reach_pct)}
                  </strong>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function RecommendationIntelligencePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        const result = await loadRecommendationIntelligence({
          limit: 10,
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;

        console.error(err);
        setError(
          err?.message ||
            "Unable to load Recommendation Intelligence from the serving layer.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <section className="recommendation-page-state">
        <PlatformLoading />
      </section>
    );
  }

  if (error) {
    return (
      <section className="platform-alert error recommendation-page-alert">
        <div className="platform-alert-icon">!</div>
        <div>
          <strong>Unable to load Recommendation Intelligence</strong>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  const overview = data?.overview || {};
  const sources = data?.sourceMix?.sources || [];
  const ranks = data?.rankPerformance?.ranks || [];
  const departments = data?.departments?.departments || [];

  const totalRecommendations = Number(overview.recommendations_generated) || 0;
  const reorderRecommendations = Number(overview.reorder_recommendations) || 0;
  const discoveryRecommendations =
    Number(overview.new_or_discovery_recommendations) || 0;

  const reorderShare =
    totalRecommendations > 0
      ? (reorderRecommendations / totalRecommendations) * 100
      : 0;

  const discoveryShare =
    totalRecommendations > 0
      ? (discoveryRecommendations / totalRecommendations) * 100
      : 0;

  const rankOne = ranks.find((item) => Number(item.recommendation_rank) === 1);

  const rankLast = ranks.length > 0 ? ranks[ranks.length - 1] : null;

  const rankLift =
    rankOne && rankLast
      ? Number(rankOne.avg_purchase_probability_pct) -
        Number(rankLast.avg_purchase_probability_pct)
      : null;

  const dominantSource =
    [...sources].sort(
      (a, b) =>
        Number(b.recommendation_count || 0) -
        Number(a.recommendation_count || 0),
    )[0] || null;

  const maxSourceCount = Math.max(
    1,
    ...sources.map((item) => Number(item.recommendation_count) || 0),
  );

  const maxDepartmentCount = Math.max(
    1,
    ...departments.map((item) => Number(item.recommendation_count) || 0),
  );

  const rankChart = buildRankChartPoints(ranks);

  const kpis = [
    {
      label: "Customers served",
      value: formatCompact(overview.customers_served),
      detail: "Customers receiving ranked recommendations",
      tone: "green",
    },
    {
      label: "Recommendations",
      value: formatCompact(overview.recommendations_generated),
      detail: `${formatNumber(overview.departments_recommended)} departments covered`,
      tone: "blue",
    },
    {
      label: "Avg. purchase probability",
      value: formatPercent(overview.avg_purchase_probability_pct),
      detail: "Average confidence across served recommendations",
      tone: "violet",
    },
    {
      label: "Discovery recommendations",
      value: formatCompact(discoveryRecommendations),
      detail: `${formatPercent(discoveryShare)} of served recommendations`,
      tone: "amber",
    },
  ];

  return (
    <div className="recommendation-intelligence-page">
      <section className="recommendation-intelligence-hero">
        <div className="recommendation-intelligence-hero-copy">
          <span className="hero-pill">Recommendation intelligence</span>

          <h2>
            Understand how the ranking system
            <span> converts candidate signals into action.</span>
          </h2>

          <p>
            This view exposes the recommendation work already built in
            Databricks: scale, candidate generation, ranking confidence and
            category coverage. It is a system-performance view, not another
            customer shopping screen.
          </p>
        </div>

        <div className="recommendation-hero-signal">
          <span>Dominant candidate source</span>
          <strong>
            {formatCandidateSource(dominantSource?.candidate_source)}
          </strong>
          <p>
            {formatPercent(dominantSource?.share_pct)} of served recommendations
          </p>

          <div className="highlight-divider" />

          <span>Rank #1 confidence</span>
          <strong>
            {formatPercent(rankOne?.avg_purchase_probability_pct)}
          </strong>
          <p>
            {rankLift === null
              ? "Top-ranked recommendation performance"
              : `${formatNumber(rankLift, 1)} percentage-point advantage vs rank #${rankLast?.recommendation_rank}`}
          </p>
        </div>
      </section>

      <section className="executive-kpi-grid recommendation-kpi-grid">
        {kpis.map((kpi) => (
          <article key={kpi.label} className={`executive-kpi-card ${kpi.tone}`}>
            <div className="kpi-card-top">
              <span>{kpi.label}</span>
              <span className="kpi-mini-mark" />
            </div>

            <strong>{kpi.value}</strong>
            <p>{kpi.detail}</p>
          </article>
        ))}
      </section>

      <section className="recommendation-two-column-grid">
        <article className="recommendation-panel source-mix-panel">
          <div className="recommendation-panel-heading">
            <div>
              <span className="panel-kicker">CANDIDATE GENERATION</span>
              <h3>Where recommendations come from</h3>
              <p>
                Compare the sources feeding the recommendation layer and verify
                how strongly the system currently relies on repeat-purchase
                candidates.
              </p>
            </div>
          </div>

          <div className="recommendation-source-list">
            {sources.map((source, index) => {
              const width =
                ((Number(source.recommendation_count) || 0) / maxSourceCount) *
                100;

              return (
                <article
                  className="recommendation-source-row"
                  key={source.candidate_source}
                >
                  <div className="recommendation-source-rank">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="recommendation-source-main">
                    <div className="recommendation-source-topline">
                      <div>
                        <strong>
                          {formatCandidateSource(source.candidate_source)}
                        </strong>
                        <span>
                          {formatCompact(source.recommendation_count)}{" "}
                          recommendations
                        </span>
                      </div>

                      <strong>{formatPercent(source.share_pct)}</strong>
                    </div>

                    <div className="recommendation-source-track">
                      <span style={{ width: `${width}%` }} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="recommendation-mix-summary">
            <div>
              <span>Reorder recommendations</span>
              <strong>{formatCompact(reorderRecommendations)}</strong>
              <small>{formatPercent(reorderShare)} of total</small>
            </div>

            <div>
              <span>Discovery / new-product</span>
              <strong>{formatCompact(discoveryRecommendations)}</strong>
              <small>{formatPercent(discoveryShare)} of total</small>
            </div>
          </div>
        </article>

        <article className="recommendation-panel ranking-panel">
          <div className="recommendation-panel-heading">
            <div>
              <span className="panel-kicker">RANKING QUALITY</span>
              <h3>Purchase probability by recommendation rank</h3>
              <p>
                A healthy ranking should place the highest-confidence products
                first. The descending probability curve makes that quality
                visible.
              </p>
            </div>
          </div>

          <div className="rank-chart-shell">
            <div className="rank-chart-y-label">Purchase probability</div>

            <svg
              className="rank-performance-chart"
              viewBox="0 0 640 280"
              role="img"
              aria-label="Average purchase probability by recommendation rank"
            >
              <g className="rank-grid">
                {[20, 30, 40, 50, 60].map((tick) => {
                  const y = rankChart.yScale(tick);
                  return (
                    <g key={tick}>
                      <line x1="58" x2="618" y1={y} y2={y} />
                      <text x="48" y={y + 4} textAnchor="end">
                        {tick}%
                      </text>
                    </g>
                  );
                })}
              </g>

              {rankChart.points.length > 0 && (
                <>
                  <polyline
                    className="rank-performance-line"
                    points={rankChart.points
                      .map((point) => `${point.x},${point.y}`)
                      .join(" ")}
                  />

                  {rankChart.points.map((point) => (
                    <g key={point.rank} className="rank-performance-point">
                      <circle cx={point.x} cy={point.y} r="5.5" />
                      <text x={point.x} y={point.y - 13} textAnchor="middle">
                        {formatNumber(point.value, 1)}%
                      </text>
                    </g>
                  ))}
                </>
              )}

              <g className="rank-chart-x-axis">
                {rankChart.points.map((point) => (
                  <text
                    key={point.rank}
                    x={point.x}
                    y="258"
                    textAnchor="middle"
                  >
                    Rank {point.rank}
                  </text>
                ))}
              </g>
            </svg>
          </div>

          <div className="rank-performance-cards">
            {ranks.map((rank) => (
              <article
                className="rank-performance-card"
                key={rank.recommendation_rank}
              >
                <span>Rank #{rank.recommendation_rank}</span>
                <strong>
                  {formatPercent(rank.avg_purchase_probability_pct)}
                </strong>
                <small>
                  {formatCompact(rank.recommendation_count)} recommendations
                </small>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="recommendation-panel recommendation-department-panel">
        <div className="recommendation-panel-heading">
          <div>
            <span className="panel-kicker">CATEGORY COVERAGE</span>
            <h3>Departments represented in recommendations</h3>
            <p>
              See which departments dominate the served recommendation set and
              whether recommendation confidence remains strong across
              categories.
            </p>
          </div>
        </div>

        <div className="recommendation-department-list">
          {departments.map((department, index) => {
            const width =
              ((Number(department.recommendation_count) || 0) /
                maxDepartmentCount) *
              100;

            return (
              <article
                className="recommendation-department-row"
                key={department.department}
              >
                <div className="recommendation-department-rank">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="recommendation-department-main">
                  <div className="recommendation-department-topline">
                    <div>
                      <strong>{titleCase(department.department)}</strong>
                      <span>
                        {formatCompact(department.recommendation_count)}{" "}
                        recommendations
                      </span>
                    </div>

                    <strong>
                      {formatPercent(department.avg_purchase_probability_pct)}
                    </strong>
                  </div>

                  <div className="recommendation-department-track">
                    <span style={{ width: `${width}%` }} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="recommendation-decision-strip">
        <article>
          <span>01</span>
          <div>
            <strong>Scale</strong>
            <p>
              {formatCompact(totalRecommendations)} scored recommendations are
              currently served across{" "}
              {formatNumber(overview.departments_recommended)} departments.
            </p>
          </div>
        </article>

        <article>
          <span>02</span>
          <div>
            <strong>Candidate concentration</strong>
            <p>
              {formatCandidateSource(dominantSource?.candidate_source)}{" "}
              currently contributes {formatPercent(dominantSource?.share_pct)}{" "}
              of the served set.
            </p>
          </div>
        </article>

        <article>
          <span>03</span>
          <div>
            <strong>Ranking signal</strong>
            <p>
              Rank #1 averages{" "}
              {formatPercent(rankOne?.avg_purchase_probability_pct)} purchase
              probability, confirming that the model concentrates stronger
              candidates near the top.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}

function CustomerIntelligencePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        const result = await loadCustomerIntelligence({
          limit: 10,
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;

        console.error(err);
        setError(
          err?.message ||
            "Unable to load Customer Intelligence from the Shopping DNA serving layer.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <section className="customer-intelligence-page-state">
        <PlatformLoading />
      </section>
    );
  }

  if (error) {
    return (
      <section className="platform-alert error customer-intelligence-page-alert">
        <div className="platform-alert-icon">!</div>
        <div>
          <strong>Unable to load Customer Intelligence</strong>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  const overview = data?.overview || {};
  const personas = data?.personas?.personas || [];
  const departments = data?.favoriteDepartments?.departments || [];
  const behaviorScores = overview.behavior_scores || {};

  const dominantPersona =
    [...personas].sort(
      (a, b) => Number(b.customer_count || 0) - Number(a.customer_count || 0),
    )[0] || null;

  const behaviorEntries = [
    ["loyalty", "Loyalty", behaviorScores.loyalty],
    ["exploration", "Exploration", behaviorScores.exploration],
    ["routine", "Routine", behaviorScores.routine],
    ["basket_intensity", "Basket intensity", behaviorScores.basket_intensity],
    ["category_focus", "Category focus", behaviorScores.category_focus],
  ];

  const dominantBehavior =
    [...behaviorEntries].sort(
      (a, b) => Number(b[2] || 0) - Number(a[2] || 0),
    )[0] || null;

  const strongestDepartment =
    [...departments].sort(
      (a, b) => Number(b.customer_count || 0) - Number(a.customer_count || 0),
    )[0] || null;

  const maxPersonaCount = Math.max(
    1,
    ...personas.map((persona) => Number(persona.customer_count) || 0),
  );

  const maxDepartmentCount = Math.max(
    1,
    ...departments.map((department) => Number(department.customer_count) || 0),
  );

  const radar = buildCustomerRadarPoints(behaviorEntries);

  const kpis = [
    {
      label: "Customers profiled",
      value: formatCompact(overview.customers_profiled),
      detail: "Shopping DNA profiles in the served population",
      tone: "green",
    },
    {
      label: "Average basket size",
      value: formatNumber(overview.avg_basket_size, 1),
      detail: "Items per observed customer order",
      tone: "blue",
    },
    {
      label: "Days between orders",
      value: formatNumber(overview.avg_days_between_orders, 1),
      detail: "Average shopping cadence",
      tone: "violet",
    },
    {
      label: "Largest persona",
      value: formatPercent(dominantPersona?.share_pct),
      detail: formatPersonaName(dominantPersona?.shopping_persona),
      tone: "amber",
    },
  ];

  return (
    <div className="customer-intelligence-page">
      <section className="customer-intelligence-hero">
        <div className="customer-intelligence-hero-copy">
          <span className="hero-pill">Customer intelligence</span>

          <h2>
            Understand who your customers are and
            <span> how they shop.</span>
          </h2>

          <p>
            This view turns the Shopping DNA work into population-level retail
            intelligence: customer personas, shopping rhythm, behavioral
            fingerprints and strongest category affinities.
          </p>
        </div>

        <div className="customer-hero-signal">
          <span>Largest shopping persona</span>
          <strong>
            {formatPersonaName(dominantPersona?.shopping_persona)}
          </strong>
          <p>
            {formatCompact(dominantPersona?.customer_count)} customers ·{" "}
            {formatPercent(dominantPersona?.share_pct)} of profiled customers
          </p>

          <div className="highlight-divider" />

          <span>Strongest population trait</span>
          <strong>{dominantBehavior?.[1] || "—"}</strong>
          <p>{formatScore(dominantBehavior?.[2])} average behavioral score</p>
        </div>
      </section>

      <section className="executive-kpi-grid customer-intelligence-kpi-grid">
        {kpis.map((kpi) => (
          <article key={kpi.label} className={`executive-kpi-card ${kpi.tone}`}>
            <div className="kpi-card-top">
              <span>{kpi.label}</span>
              <span className="kpi-mini-mark" />
            </div>

            <strong>{kpi.value}</strong>
            <p>{kpi.detail}</p>
          </article>
        ))}
      </section>

      <section className="customer-intelligence-two-column-grid">
        <article className="customer-intelligence-panel persona-panel">
          <div className="customer-intelligence-panel-heading">
            <div>
              <span className="panel-kicker">CUSTOMER SEGMENTS</span>
              <h3>Shopping persona distribution</h3>
              <p>
                Compare the major Shopping DNA personas and see how much of the
                profiled customer base each behavioral archetype represents.
              </p>
            </div>
          </div>

          <div className="persona-distribution-list">
            {personas.map((persona, index) => {
              const width =
                ((Number(persona.customer_count) || 0) / maxPersonaCount) * 100;

              return (
                <article
                  className="persona-distribution-row"
                  key={persona.shopping_persona}
                >
                  <div className="persona-rank">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="persona-distribution-main">
                    <div className="persona-distribution-topline">
                      <div>
                        <strong>
                          {formatPersonaName(persona.shopping_persona)}
                        </strong>
                        <span>
                          {personaDescription(persona.shopping_persona)}
                        </span>
                      </div>

                      <div className="persona-distribution-metrics">
                        <strong>{formatPercent(persona.share_pct)}</strong>
                        <span>
                          {formatCompact(persona.customer_count)} customers
                        </span>
                      </div>
                    </div>

                    <div className="persona-share-track">
                      <span style={{ width: `${width}%` }} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <article className="customer-intelligence-panel behavior-panel">
          <div className="customer-intelligence-panel-heading">
            <div>
              <span className="panel-kicker">BEHAVIORAL FINGERPRINT</span>
              <h3>Average Shopping DNA</h3>
              <p>
                The five behavioral dimensions summarize the average customer
                profile across loyalty, exploration, routine, basket intensity
                and category focus.
              </p>
            </div>
          </div>

          <div className="behavior-fingerprint-layout">
            <div className="behavior-radar-shell">
              <svg
                className="behavior-radar"
                viewBox="0 0 320 300"
                role="img"
                aria-label="Average customer Shopping DNA radar"
              >
                {[20, 40, 60, 80, 100].map((level) => (
                  <polygon
                    key={level}
                    className="behavior-radar-grid"
                    points={buildRadarPolygon(level)}
                  />
                ))}

                {radar.axes.map((axis) => (
                  <line
                    key={axis.key}
                    className="behavior-radar-axis"
                    x1="160"
                    y1="145"
                    x2={axis.x}
                    y2={axis.y}
                  />
                ))}

                <polygon
                  className="behavior-radar-area"
                  points={radar.points
                    .map((point) => `${point.x},${point.y}`)
                    .join(" ")}
                />

                {radar.points.map((point) => (
                  <circle
                    key={point.key}
                    className="behavior-radar-point"
                    cx={point.x}
                    cy={point.y}
                    r="5"
                  />
                ))}

                {radar.labels.map((label) => (
                  <g key={label.key} className="behavior-radar-label">
                    <text x={label.x} y={label.y} textAnchor={label.anchor}>
                      {label.label}
                    </text>
                    <text
                      className="behavior-radar-label-value"
                      x={label.x}
                      y={label.y + 14}
                      textAnchor={label.anchor}
                    >
                      {formatScore(label.value)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="behavior-score-list">
              {behaviorEntries.map(([key, label, value]) => (
                <div className="behavior-score-row" key={key}>
                  <div className="behavior-score-topline">
                    <span>{label}</span>
                    <strong>{formatScore(value)}</strong>
                  </div>

                  <div className="behavior-score-track">
                    <span style={{ width: `${clampPercent(value)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="shopping-rhythm-strip">
            <div>
              <span>Average basket</span>
              <strong>{formatNumber(overview.avg_basket_size, 1)}</strong>
              <small>items / order</small>
            </div>

            <div>
              <span>Order cadence</span>
              <strong>
                {formatNumber(overview.avg_days_between_orders, 1)}
              </strong>
              <small>days between orders</small>
            </div>
          </div>
        </article>
      </section>

      <section className="customer-intelligence-panel customer-department-panel">
        <div className="customer-intelligence-panel-heading">
          <div>
            <span className="panel-kicker">CATEGORY AFFINITY</span>
            <h3>Most common favorite departments</h3>
            <p>
              See which departments most often appear as a customer's strongest
              category affinity and how concentrated that preference is.
            </p>
          </div>
        </div>

        <div className="customer-department-list">
          {departments.map((department, index) => {
            const width =
              ((Number(department.customer_count) || 0) / maxDepartmentCount) *
              100;

            return (
              <article
                className="customer-department-row"
                key={department.department}
              >
                <div className="customer-department-rank">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="customer-department-main">
                  <div className="customer-department-topline">
                    <div>
                      <strong>{titleCase(department.department)}</strong>
                      <span>
                        {formatCompact(department.customer_count)} customers
                      </span>
                    </div>

                    <div className="customer-department-metrics">
                      <div>
                        <span>Customer share</span>
                        <strong>
                          {formatPercent(department.customer_share_pct)}
                        </strong>
                      </div>
                      <div>
                        <span>Avg affinity</span>
                        <strong>
                          {formatPercent(department.avg_affinity_pct)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="customer-department-track">
                    <span style={{ width: `${width}%` }} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="customer-decision-strip">
        <article>
          <span>01</span>
          <div>
            <strong>Customer base</strong>
            <p>
              {formatCompact(overview.customers_profiled)} customer profiles are
              available for population-level behavioral analysis.
            </p>
          </div>
        </article>

        <article>
          <span>02</span>
          <div>
            <strong>Dominant persona</strong>
            <p>
              {formatPersonaName(dominantPersona?.shopping_persona)} represents{" "}
              {formatPercent(dominantPersona?.share_pct)} of the profiled base.
            </p>
          </div>
        </article>

        <article>
          <span>03</span>
          <div>
            <strong>Category signal</strong>
            <p>
              {titleCase(strongestDepartment?.department)} is the most common
              strongest department affinity, covering{" "}
              {formatPercent(strongestDepartment?.customer_share_pct)} of
              customers.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}

function Customer360Page() {
  const [customers, setCustomers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(21);
  const [customerInput, setCustomerInput] = useState("21");
  const [data, setData] = useState(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("snapshot");
  const [basketItems, setBasketItems] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCustomerList() {
      try {
        setLoadingCustomers(true);

        const result = await getCustomers({
          limit: 100,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const rows = result?.customers || [];
        setCustomers(rows);

        if (rows.length > 0) {
          const containsDefault = rows.some(
            (customer) => Number(customer.user_id) === 21,
          );

          if (!containsDefault) {
            const firstId = Number(rows[0].user_id);
            setSelectedUserId(firstId);
            setCustomerInput(String(firstId));
          }
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error(err);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCustomers(false);
        }
      }
    }

    loadCustomerList();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedUserId) return undefined;

    const controller = new AbortController();

    async function loadCustomer() {
      try {
        setLoadingCustomer(true);
        setError("");

        const result = await getCustomer360(selectedUserId, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;

        console.error(err);
        setData(null);
        setError(
          err?.message ||
            `Unable to load Customer 360 intelligence for customer ${selectedUserId}.`,
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCustomer(false);
        }
      }
    }

    loadCustomer();
    return () => controller.abort();
  }, [selectedUserId]);

  useEffect(() => {
    if (!data) {
      setBasketItems([]);
      return;
    }

    setBasketItems(buildSuggestedCustomerBasket(data));
  }, [data]);

  function submitCustomer(event) {
    event.preventDefault();

    const parsed = Number(customerInput);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError("Enter a valid positive customer ID.");
      return;
    }

    setActiveView("snapshot");
    setSelectedUserId(parsed);
  }

  function chooseCustomer(event) {
    const value = Number(event.target.value);

    if (!Number.isFinite(value) || value <= 0) return;

    setCustomerInput(String(value));
    setActiveView("snapshot");
    setSelectedUserId(value);
  }

  function addSignalToBasket(item, source, reason, probabilityPct) {
    const normalized = normalizeCustomer360BasketItem(
      item,
      source,
      reason,
      probabilityPct,
    );

    if (!normalized) return;

    setBasketItems((current) =>
      mergeCustomer360BasketItem(current, normalized),
    );
  }

  function removeBasketItem(productId) {
    setBasketItems((current) =>
      current.filter((item) => Number(item.product_id) !== Number(productId)),
    );
  }

  function resetSuggestedBasket() {
    setBasketItems(buildSuggestedCustomerBasket(data));
  }

  function clearBasket() {
    setBasketItems([]);
  }

  if (loadingCustomer && !data) {
    return (
      <section className="customer360-page-state">
        <PlatformLoading />
      </section>
    );
  }

  const summary = data?.customer_summary || {};
  const nextBasket = data?.next_basket || {};
  const predictions = nextBasket?.predictions || [];
  const recommendation = data?.recommendation_intelligence || {};
  const reorder = data?.reorder_intelligence || null;
  const dna = data?.shopping_dna || {};
  const fingerprint = dna?.fingerprint || {};
  const rhythm = dna?.shopping_rhythm || {};
  const history = dna?.history || {};
  const categorySignature = dna?.category_signature || {};

  const recommendationSectionOrder = [
    ["reorder_now", "Reorder now"],
    ["coming_up", "Coming up"],
    ["favorites_for_later", "Favorites for later"],
    ["discover", "Discover"],
    ["other_recommendations", "Other recommendations"],
  ];

  const recommendationItems = recommendationSectionOrder.flatMap(
    ([key, label]) =>
      (recommendation?.sections?.[key] || []).map((item) => ({
        ...item,
        sectionKey: key,
        sectionLabel: label,
      })),
  );

  const reorderSectionOrder = [
    ["overdue", "Overdue"],
    ["due_now", "Due now"],
    ["due_soon", "Due soon"],
    ["early", "Early"],
    ["no_established_cycle", "Learning cycle"],
    ["other", "Other"],
  ];

  const reorderItems = reorderSectionOrder.flatMap(([key, label]) =>
    (reorder?.sections?.[key] || []).map((item) => ({
      ...item,
      sectionKey: key,
      sectionLabel: label,
    })),
  );

  const dnaEntries = [
    ["loyalty", "Loyalty", fingerprint.loyalty],
    ["exploration", "Exploration", fingerprint.exploration],
    ["routine", "Routine", fingerprint.routine],
    ["basket_intensity", "Basket intensity", fingerprint.basket_intensity],
    ["category_focus", "Category focus", fingerprint.category_focus],
  ];

  const radar = buildCustomerRadarPoints(dnaEntries);
  const departments = (categorySignature.departments || []).filter(
    (item) => item?.name,
  );
  const aisles = (categorySignature.aisles || []).filter((item) => item?.name);
  const insightItems = Object.entries(dna?.insights || {}).filter(([, value]) =>
    Boolean(value),
  );

  const activeCustomer = customers.find(
    (customer) => Number(customer.user_id) === Number(selectedUserId),
  );

  const topPrediction = predictions[0] || null;
  const attentionCount = Number(reorder?.attention_count || 0);
  const topDepartment = departments[0] || null;
  const basketProductIds = new Set(
    basketItems.map((item) => Number(item.product_id)),
  );
  const basketSourceCounts = countCustomer360BasketSources(basketItems);
  const basketAverageProbability = basketItems.length
    ? basketItems.reduce(
        (sum, item) => sum + Number(item.probability_pct || 0),
        0,
      ) / basketItems.length
    : 0;

  const kpis = [
    {
      label: "Prior orders",
      value: formatNumber(summary.prior_orders ?? history.prior_orders),
      detail: `${formatNumber(summary.unique_products ?? history.unique_products)} unique products observed`,
      tone: "green",
    },
    {
      label: "Next-basket confidence",
      value: formatPercent(summary.top_prediction_probability_pct),
      detail: topPrediction?.product_name || "Top-ranked ML prediction",
      tone: "blue",
    },
    {
      label: "Reorder attention",
      value: formatNumber(attentionCount),
      detail:
        attentionCount === 1
          ? "product currently needs attention"
          : "products currently need attention",
      tone: "violet",
    },
    {
      label: "Favorite department",
      value: titleCase(summary.favorite_department),
      detail: `${formatPercent(topDepartment?.affinity_pct)} affinity`,
      tone: "amber",
    },
  ];

  const views = [
    { id: "snapshot", label: "Snapshot", short: "Customer at a glance" },
    {
      id: "next-basket",
      label: "Next Basket",
      short: `${formatNumber(predictions.length)} predictions`,
    },
    {
      id: "reorder",
      label: "Reorder Cycle",
      short: `${formatNumber(attentionCount)} need attention`,
    },
    {
      id: "recommendations",
      label: "Recommendations",
      short: `${formatNumber(recommendationItems.length)} served`,
    },
    {
      id: "basket",
      label: "Action Basket",
      short: `${formatNumber(basketItems.length)} suggested items`,
    },
    {
      id: "dna",
      label: "Shopping DNA",
      short: formatPersonaName(dna?.profile?.dominant_trait),
    },
  ];

  return (
    <div className="customer360-page customer360-v2">
      <section className="customer360-toolbar customer360-toolbar-v2">
        <div className="customer360-toolbar-copy">
          <span className="panel-kicker">LOYALTY DESK</span>
          <strong>Find a shopper and open the full customer story</strong>
          <p>
            One customer ID connects purchase history, ML predictions, reorder
            timing, recommendation logic and Shopping DNA.
          </p>
        </div>

        <div className="customer360-controls">
          <label>
            <span>Quick select</span>
            <select
              value={String(selectedUserId)}
              onChange={chooseCustomer}
              disabled={loadingCustomers || customers.length === 0}
            >
              {!customers.some(
                (customer) =>
                  Number(customer.user_id) === Number(selectedUserId),
              ) && (
                <option value={selectedUserId}>
                  Customer {selectedUserId}
                </option>
              )}

              {customers.map((customer) => (
                <option key={customer.user_id} value={customer.user_id}>
                  Customer {customer.user_id} · {customer.recommendation_count}{" "}
                  recs
                </option>
              ))}
            </select>
          </label>

          <form className="customer360-id-form" onSubmit={submitCustomer}>
            <label>
              <span>Customer ID</span>
              <input
                type="number"
                min="1"
                step="1"
                value={customerInput}
                onChange={(event) => setCustomerInput(event.target.value)}
                aria-label="Customer ID"
              />
            </label>

            <button type="submit">Open profile</button>
          </form>
        </div>
      </section>

      {error && (
        <section className="platform-alert error customer360-alert">
          <div className="platform-alert-icon">!</div>
          <div>
            <strong>Unable to load Customer 360</strong>
            <p>{error}</p>
          </div>
        </section>
      )}

      {loadingCustomer && data && (
        <div className="customer360-refreshing">
          Refreshing customer intelligence…
        </div>
      )}

      {data && (
        <>
          <section className="customer360-profile-strip">
            <div className="customer360-profile-strip-main">
              <span className="customer360-number">
                Customer #{selectedUserId}
              </span>
              <div>
                <strong>{formatPersonaName(summary.persona)}</strong>
                <p>
                  {summary.headline || dna.summary || dna.persona_description}
                </p>
              </div>
            </div>

            <div className="customer360-profile-strip-facts">
              <div>
                <span>Top prediction</span>
                <strong>{topPrediction?.product_name || "—"}</strong>
              </div>
              <div>
                <span>Needs attention</span>
                <strong>{formatNumber(attentionCount)}</strong>
              </div>
              <div>
                <span>Favorite aisle</span>
                <strong>{titleCase(aisles[0]?.name || "—")}</strong>
              </div>
            </div>
          </section>

          <nav
            className="customer360-view-tabs"
            aria-label="Customer intelligence views"
          >
            {views.map((view, index) => (
              <button
                type="button"
                key={view.id}
                className={activeView === view.id ? "active" : ""}
                onClick={() => setActiveView(view.id)}
              >
                <span className="customer360-tab-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="customer360-tab-copy">
                  <strong>{view.label}</strong>
                  <small>{view.short}</small>
                </span>
              </button>
            ))}
          </nav>

          {activeView === "snapshot" && (
            <div className="customer360-view-panel customer360-snapshot-view">
              <section className="customer360-snapshot-hero">
                <div className="customer360-snapshot-copy">
                  <span className="hero-pill">
                    Customer 360 · #{selectedUserId}
                  </span>
                  <h2>
                    {formatPersonaName(summary.persona)}
                    <span> in one checkout-sized view.</span>
                  </h2>
                  <p>
                    {summary.headline ||
                      dna.summary ||
                      dna.persona_description ||
                      "Unified customer intelligence is available for this customer."}
                  </p>

                  <div className="customer360-hero-tags">
                    <span>
                      {formatPersonaName(dna?.profile?.dominant_trait)} dominant
                      trait
                    </span>
                    <span>
                      {formatPersonaName(history.loyalty_profile)} loyalty
                      profile
                    </span>
                    <span>
                      {titleCase(summary.favorite_department)} affinity
                    </span>
                  </div>
                </div>

                <aside className="customer360-basket-note">
                  <div className="customer360-basket-note-header">
                    <span>THIS CUSTOMER TODAY</span>
                    <strong>#{selectedUserId}</strong>
                  </div>

                  <div className="customer360-basket-note-row">
                    <span>Most likely next</span>
                    <strong>{topPrediction?.product_name || "—"}</strong>
                    <small>
                      {formatPercent(topPrediction?.predicted_probability_pct)}{" "}
                      probability
                    </small>
                  </div>

                  <div className="customer360-basket-note-row">
                    <span>Reorder attention</span>
                    <strong>
                      {attentionCount} item{attentionCount === 1 ? "" : "s"}
                    </strong>
                    <small>
                      {reorder?.planner_summary || "Nothing urgent right now."}
                    </small>
                  </div>

                  <div className="customer360-basket-note-row">
                    <span>Favorite department</span>
                    <strong>{titleCase(summary.favorite_department)}</strong>
                    <small>
                      {formatPercent(topDepartment?.affinity_pct)} affinity
                    </small>
                  </div>
                </aside>
              </section>

              <section className="executive-kpi-grid customer360-kpi-grid customer360-kpi-grid-v2">
                {kpis.map((kpi) => (
                  <article
                    key={kpi.label}
                    className={`executive-kpi-card ${kpi.tone}`}
                  >
                    <div className="kpi-card-top">
                      <span>{kpi.label}</span>
                      <span className="kpi-mini-mark" />
                    </div>
                    <strong>{kpi.value}</strong>
                    <p>{kpi.detail}</p>
                  </article>
                ))}
              </section>

              <section className="customer360-snapshot-lanes">
                <article className="customer360-snapshot-lane prediction">
                  <span className="customer360-lane-number">01</span>
                  <div>
                    <span className="panel-kicker">NEXT-BASKET ML</span>
                    <strong>
                      {topPrediction?.product_name || "No prediction"}
                    </strong>
                    <p>
                      Leads the model ranking at{" "}
                      {formatPercent(topPrediction?.predicted_probability_pct)}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveView("next-basket")}
                  >
                    View ranking
                  </button>
                </article>

                <article className="customer360-snapshot-lane reorder">
                  <span className="customer360-lane-number">02</span>
                  <div>
                    <span className="panel-kicker">REORDER CYCLE</span>
                    <strong>
                      {attentionCount} item{attentionCount === 1 ? "" : "s"}{" "}
                      need attention
                    </strong>
                    <p>
                      {reorder?.planner_summary || "No urgent reorder signal."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveView("reorder")}
                  >
                    Open planner
                  </button>
                </article>

                <article className="customer360-snapshot-lane dna">
                  <span className="customer360-lane-number">03</span>
                  <div>
                    <span className="panel-kicker">SHOPPING DNA</span>
                    <strong>
                      {formatPersonaName(dna?.profile?.dominant_trait)}
                    </strong>
                    <p>
                      Strongest behavioral signal inside the customer profile.
                    </p>
                  </div>
                  <button type="button" onClick={() => setActiveView("dna")}>
                    View DNA
                  </button>
                </article>
              </section>
            </div>
          )}

          {activeView === "next-basket" && (
            <section className="customer360-view-panel customer360-panel customer360-focus-panel">
              <div className="customer360-panel-heading">
                <div>
                  <span className="panel-kicker">NEXT-BASKET ML</span>
                  <h3>What this customer is most likely to purchase next</h3>
                  <p>
                    Ranked model probabilities from the next-basket pipeline.
                    These are predictions, not manually selected products.
                  </p>
                </div>
                <div className="customer360-panel-badge">
                  {formatNumber(nextBasket.total_predictions)} predictions
                </div>
              </div>

              <div className="customer360-prediction-list customer360-prediction-list-v2">
                {predictions.map((item) => (
                  <article
                    className="customer360-prediction-row"
                    key={item.product_id}
                  >
                    <div className="customer360-rank">#{item.rank}</div>
                    <div className="customer360-row-main">
                      <div className="customer360-row-topline">
                        <div>
                          <strong>{item.product_name}</strong>
                          <span>
                            {titleCase(item.department)} ·{" "}
                            {titleCase(item.aisle)}
                          </span>
                        </div>
                        <strong className="customer360-probability">
                          {formatPercent(item.predicted_probability_pct)}
                        </strong>
                      </div>

                      <div className="customer360-probability-track">
                        <span
                          style={{
                            width: `${clampPercent(item.predicted_probability_pct)}%`,
                          }}
                        />
                      </div>

                      <div className="customer360-row-meta">
                        <span>
                          {formatPersonaName(item.candidate_source)} candidate
                        </span>
                        <span>
                          {item.is_new_to_customer
                            ? "New to customer"
                            : "Previously purchased"}
                        </span>
                        <button
                          type="button"
                          className={`customer360-inline-basket-button ${
                            basketProductIds.has(Number(item.product_id))
                              ? "added"
                              : ""
                          }`}
                          onClick={() =>
                            addSignalToBasket(
                              item,
                              "ML Prediction",
                              `Rank #${item.rank} next-basket prediction`,
                              item.predicted_probability_pct,
                            )
                          }
                          disabled={basketProductIds.has(
                            Number(item.product_id),
                          )}
                        >
                          {basketProductIds.has(Number(item.product_id))
                            ? "In basket"
                            : "Add to basket"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeView === "reorder" && (
            <section className="customer360-view-panel customer360-panel customer360-focus-panel">
              <div className="customer360-panel-heading">
                <div>
                  <span className="panel-kicker">REORDER INTELLIGENCE</span>
                  <h3>
                    Timing against this customer's observed purchase cycle
                  </h3>
                  <p>
                    Compare elapsed orders with each product's usual repeat
                    interval to see what is overdue, due, approaching, or still
                    early.
                  </p>
                </div>
                <div className="customer360-panel-badge">
                  {formatNumber(reorderItems.length)} cycle signals
                </div>
              </div>

              <div className="customer360-status-grid customer360-status-grid-v2">
                {[
                  ["overdue", "Overdue"],
                  ["due_now", "Due now"],
                  ["due_soon", "Due soon"],
                  ["early", "Early"],
                ].map(([key, label]) => (
                  <div className={`customer360-status-card ${key}`} key={key}>
                    <span>{label}</span>
                    <strong>
                      {formatNumber(reorder?.status_counts?.[key] || 0)}
                    </strong>
                  </div>
                ))}
              </div>

              {reorderItems.length > 0 ? (
                <div className="customer360-reorder-list customer360-reorder-list-v2">
                  {reorderItems.map((item) => (
                    <article
                      className="customer360-reorder-row"
                      key={`${item.product_id}-${item.sectionKey}`}
                    >
                      <div className="customer360-reorder-topline">
                        <div>
                          <strong>{item.product_name}</strong>
                          <span>
                            {titleCase(item.department)} ·{" "}
                            {titleCase(item.aisle)}
                          </span>
                        </div>
                        <div className="customer360-row-actions">
                          <span
                            className={`customer360-status-badge ${item.sectionKey}`}
                          >
                            {item.sectionLabel}
                          </span>
                          <button
                            type="button"
                            className={`customer360-inline-basket-button ${
                              basketProductIds.has(Number(item.product_id))
                                ? "added"
                                : ""
                            }`}
                            onClick={() =>
                              addSignalToBasket(
                                item,
                                "Reorder",
                                `${item.sectionLabel} reorder-cycle signal`,
                                item.purchase_probability_pct,
                              )
                            }
                            disabled={basketProductIds.has(
                              Number(item.product_id),
                            )}
                          >
                            {basketProductIds.has(Number(item.product_id))
                              ? "In basket"
                              : "Add"}
                          </button>
                        </div>
                      </div>

                      <div className="customer360-reorder-metrics">
                        <div>
                          <span>Orders since purchase</span>
                          <strong>
                            {formatNumber(item.orders_since_last_purchase)}
                          </strong>
                        </div>
                        <div>
                          <span>Usual gap</span>
                          <strong>
                            {formatNumber(item.usual_order_gap, 1)}
                          </strong>
                        </div>
                        <div>
                          <span>Historical reorder</span>
                          <strong>
                            {formatPercent(item.historical_reorder_rate_pct)}
                          </strong>
                        </div>
                      </div>

                      <p>{item.why}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="customer360-empty-state">
                  No reorder-cycle rows are currently surfaced for this
                  customer.
                </div>
              )}
            </section>
          )}

          {activeView === "recommendations" && (
            <section className="customer360-view-panel customer360-panel customer360-focus-panel">
              <div className="customer360-panel-heading">
                <div>
                  <span className="panel-kicker">
                    RECOMMENDATION INTELLIGENCE
                  </span>
                  <h3>
                    Why the recommendation layer is surfacing these products
                  </h3>
                  <p>
                    Recommendation strategy remains separate from next-basket
                    prediction: section, candidate source, suggested action and
                    explanation are all retained.
                  </p>
                </div>
                <div className="customer360-panel-badge">
                  {formatNumber(recommendation.total_recommendations)} served
                </div>
              </div>

              <div className="customer360-recommendation-grid customer360-recommendation-grid-v2">
                {recommendationItems.map((item) => (
                  <article
                    className="customer360-recommendation-card"
                    key={`${item.product_id}-${item.sectionKey}`}
                  >
                    <div className="customer360-recommendation-topline">
                      <span
                        className={`customer360-section-badge ${item.sectionKey}`}
                      >
                        {item.sectionLabel}
                      </span>
                      <strong>
                        {formatPercent(item.purchase_probability_pct)}
                      </strong>
                    </div>

                    <h4>{item.product_name}</h4>
                    <p className="customer360-recommendation-category">
                      {titleCase(item.department)} · {titleCase(item.aisle)}
                    </p>

                    <div className="customer360-recommendation-meta">
                      <div>
                        <span>Candidate source</span>
                        <strong>
                          {formatPersonaName(item.candidate_source)}
                        </strong>
                      </div>
                      <div>
                        <span>Suggested action</span>
                        <strong>{item.action || "Review"}</strong>
                      </div>
                    </div>

                    <p className="customer360-reason">{item.why_recommended}</p>

                    <button
                      type="button"
                      className={`customer360-inline-basket-button recommendation ${
                        basketProductIds.has(Number(item.product_id))
                          ? "added"
                          : ""
                      }`}
                      onClick={() =>
                        addSignalToBasket(
                          item,
                          item.sectionKey === "discover"
                            ? "Discovery"
                            : "Recommendation",
                          item.sectionLabel ||
                            item.action ||
                            "Recommendation signal",
                          item.purchase_probability_pct,
                        )
                      }
                      disabled={basketProductIds.has(Number(item.product_id))}
                    >
                      {basketProductIds.has(Number(item.product_id))
                        ? "Already in basket"
                        : "Add to action basket"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeView === "basket" && (
            <section className="customer360-view-panel customer360-panel customer360-action-basket-panel">
              <div className="customer360-panel-heading customer360-basket-heading">
                <div>
                  <span className="panel-kicker">ACTION CENTER</span>
                  <h3>
                    Suggested basket built from the customer's strongest signals
                  </h3>
                  <p>
                    The default pick list combines the top three next-basket
                    predictions with every overdue or due-now reorder item.
                    Duplicate products are merged so one product can carry
                    multiple reasons.
                  </p>
                </div>

                <div className="customer360-basket-heading-actions">
                  <div className="customer360-panel-badge">
                    {formatNumber(basketItems.length)} items
                  </div>
                  <button type="button" onClick={resetSuggestedBasket}>
                    Reset suggestion
                  </button>
                </div>
              </div>

              <div className="customer360-action-basket-layout">
                <div className="customer360-pick-list">
                  <div className="customer360-pick-list-header">
                    <div>
                      <span className="panel-kicker">PICK LIST</span>
                      <strong>Customer #{selectedUserId}</strong>
                    </div>
                    <button
                      type="button"
                      className="customer360-clear-basket-button"
                      onClick={clearBasket}
                      disabled={basketItems.length === 0}
                    >
                      Clear basket
                    </button>
                  </div>

                  {basketItems.length > 0 ? (
                    <div className="customer360-pick-list-items">
                      {basketItems.map((item, index) => (
                        <article
                          className="customer360-pick-list-row"
                          key={`basket-${item.product_id}`}
                        >
                          <div className="customer360-pick-number">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="customer360-pick-main">
                            <div className="customer360-pick-topline">
                              <div>
                                <strong>{item.product_name}</strong>
                                <span>
                                  {titleCase(item.department)} ·{" "}
                                  {titleCase(item.aisle)}
                                </span>
                              </div>

                              {Number(item.probability_pct) > 0 && (
                                <strong className="customer360-pick-probability">
                                  {formatPercent(item.probability_pct)}
                                </strong>
                              )}
                            </div>

                            <div className="customer360-pick-sources">
                              {(item.sources || []).map((source) => (
                                <span
                                  className={`customer360-source-chip ${customer360SourceClass(source)}`}
                                  key={`${item.product_id}-${source}`}
                                >
                                  {source}
                                </span>
                              ))}
                            </div>

                            <p>
                              {(item.reasons || []).join(" · ") ||
                                "Added from customer intelligence."}
                            </p>
                          </div>

                          <button
                            type="button"
                            className="customer360-remove-pick-button"
                            onClick={() => removeBasketItem(item.product_id)}
                            aria-label={`Remove ${item.product_name} from action basket`}
                          >
                            Remove
                          </button>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="customer360-basket-empty">
                      <span>EMPTY PICK LIST</span>
                      <strong>
                        No products are currently in the action basket.
                      </strong>
                      <p>
                        Reset the suggestion or add products from Next Basket,
                        Reorder Cycle or Recommendations.
                      </p>
                      <button type="button" onClick={resetSuggestedBasket}>
                        Restore suggested basket
                      </button>
                    </div>
                  )}
                </div>

                <aside className="customer360-basket-receipt">
                  <div className="customer360-receipt-ticket">
                    <span className="customer360-receipt-label">
                      CUSTOMER ACTION BASKET
                    </span>
                    <strong>#{selectedUserId}</strong>
                    <small>Decision-support pick list</small>
                  </div>

                  <div className="customer360-receipt-line">
                    <span>Total items</span>
                    <strong>{formatNumber(basketItems.length)}</strong>
                  </div>
                  <div className="customer360-receipt-line">
                    <span>ML prediction signals</span>
                    <strong>
                      {formatNumber(basketSourceCounts["ML Prediction"] || 0)}
                    </strong>
                  </div>
                  <div className="customer360-receipt-line">
                    <span>Reorder signals</span>
                    <strong>
                      {formatNumber(basketSourceCounts.Reorder || 0)}
                    </strong>
                  </div>
                  <div className="customer360-receipt-line">
                    <span>Recommendation signals</span>
                    <strong>
                      {formatNumber(
                        (basketSourceCounts.Recommendation || 0) +
                          (basketSourceCounts.Discovery || 0),
                      )}
                    </strong>
                  </div>
                  <div className="customer360-receipt-line total">
                    <span>Avg. surfaced probability</span>
                    <strong>
                      {basketItems.length > 0
                        ? formatPercent(basketAverageProbability)
                        : "—"}
                    </strong>
                  </div>

                  <div className="customer360-basket-rules">
                    <span className="panel-kicker">DEFAULT LOGIC</span>
                    <ol>
                      <li>
                        Take the three highest-ranked next-basket predictions.
                      </li>
                      <li>Add every product currently overdue or due now.</li>
                      <li>
                        Merge duplicate products and keep every supporting
                        signal.
                      </li>
                    </ol>
                  </div>

                  <p className="customer360-basket-note-copy">
                    This basket is a decision-support output. It does not
                    replace the ML model, recommendation layer or reorder logic;
                    it combines their results into one operational customer
                    action.
                  </p>
                </aside>
              </div>
            </section>
          )}

          {activeView === "dna" && (
            <section className="customer360-view-panel customer360-panel customer360-dna-panel customer360-focus-panel">
              <div className="customer360-panel-heading">
                <div>
                  <span className="panel-kicker">SHOPPING DNA</span>
                  <h3>
                    {dna?.profile?.headline ||
                      formatPersonaName(dna?.profile?.persona)}
                  </h3>
                  <p>
                    {dna.summary ||
                      dna.persona_description ||
                      "Behavioral fingerprint and category signature for this customer."}
                  </p>
                </div>
                <div className="customer360-panel-badge">
                  {dna?.profile?.dna_code || `Customer ${selectedUserId}`}
                </div>
              </div>

              <div className="customer360-dna-layout">
                <div className="customer360-dna-radar-column">
                  <div className="behavior-radar-shell customer360-radar-shell">
                    <svg
                      className="behavior-radar"
                      viewBox="0 0 320 300"
                      role="img"
                      aria-label={`Shopping DNA radar for customer ${selectedUserId}`}
                    >
                      {[20, 40, 60, 80, 100].map((level) => (
                        <polygon
                          key={level}
                          className="behavior-radar-grid"
                          points={buildRadarPolygon(level)}
                        />
                      ))}

                      {radar.axes.map((axis) => (
                        <line
                          key={axis.key}
                          className="behavior-radar-axis"
                          x1="160"
                          y1="145"
                          x2={axis.x}
                          y2={axis.y}
                        />
                      ))}

                      <polygon
                        className="behavior-radar-area"
                        points={radar.points
                          .map((point) => `${point.x},${point.y}`)
                          .join(" ")}
                      />

                      {radar.points.map((point) => (
                        <circle
                          key={point.key}
                          className="behavior-radar-point"
                          cx={point.x}
                          cy={point.y}
                          r="5"
                        />
                      ))}

                      {radar.labels.map((label) => (
                        <g key={label.key} className="behavior-radar-label">
                          <text
                            x={label.x}
                            y={label.y}
                            textAnchor={label.anchor}
                          >
                            {label.label}
                          </text>
                          <text
                            className="behavior-radar-label-value"
                            x={label.x}
                            y={label.y + 14}
                            textAnchor={label.anchor}
                          >
                            {formatScore(label.value)}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>

                  <div className="behavior-score-list customer360-score-list">
                    {dnaEntries.map(([key, label, value]) => (
                      <div className="behavior-score-row" key={key}>
                        <div className="behavior-score-topline">
                          <span>{label}</span>
                          <strong>{formatScore(value)}</strong>
                        </div>
                        <div className="behavior-score-track">
                          <span style={{ width: `${clampPercent(value)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="customer360-dna-detail-column">
                  <div className="customer360-profile-card">
                    <span>Behavioral identity</span>
                    <strong>{formatPersonaName(dna?.profile?.persona)}</strong>
                    <p>{dna.persona_description}</p>

                    <div className="customer360-profile-grid">
                      <div>
                        <span>Shopping frequency</span>
                        <strong>{formatPersonaName(rhythm.frequency)}</strong>
                      </div>
                      <div>
                        <span>Regularity</span>
                        <strong>{formatPersonaName(rhythm.regularity)}</strong>
                      </div>
                      <div>
                        <span>Basket momentum</span>
                        <strong>
                          {formatPersonaName(rhythm.basket_momentum)}
                        </strong>
                      </div>
                      <div>
                        <span>Preferred time</span>
                        <strong>
                          {rhythm.preferred_hour_label ||
                            rhythm.preferred_time_period ||
                            "—"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="customer360-signature-grid">
                    <div>
                      <span className="panel-kicker">TOP DEPARTMENTS</span>
                      {departments.map((department) => (
                        <div
                          className="customer360-signature-row"
                          key={`department-${department.rank}`}
                        >
                          <span>
                            #{department.rank} {titleCase(department.name)}
                          </span>
                          <strong>
                            {formatPercent(department.affinity_pct)}
                          </strong>
                        </div>
                      ))}
                    </div>

                    <div>
                      <span className="panel-kicker">TOP AISLES</span>
                      {aisles.map((aisle) => (
                        <div
                          className="customer360-signature-row"
                          key={`aisle-${aisle.rank}`}
                        >
                          <span>
                            #{aisle.rank} {titleCase(aisle.name)}
                          </span>
                          <strong>{formatPercent(aisle.affinity_pct)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {insightItems.length > 0 && (
                <div className="customer360-insight-grid">
                  {insightItems.map(([key, value]) => (
                    <article key={key}>
                      <span>{formatPersonaName(key)}</span>
                      <p>{value}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeCustomer && (
            <p className="customer360-serving-note customer360-serving-note-v2">
              Serving record: target order {activeCustomer.target_order_id} ·{" "}
              {activeCustomer.recommendation_count} recommendation rows
              available.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function normalizeCustomer360BasketItem(item, source, reason, probabilityPct) {
  const productId = Number(item?.product_id);

  if (!Number.isFinite(productId)) {
    return null;
  }

  const probability = Number(
    probabilityPct ??
      item?.predicted_probability_pct ??
      item?.purchase_probability_pct ??
      0,
  );

  return {
    product_id: productId,
    product_name: item?.product_name || `Product ${productId}`,
    department: item?.department || "",
    aisle: item?.aisle || "",
    probability_pct: Number.isFinite(probability) ? probability : 0,
    sources: source ? [source] : [],
    reasons: reason ? [reason] : [],
  };
}

function mergeCustomer360BasketItem(items, incoming) {
  const current = Array.isArray(items) ? items : [];
  const index = current.findIndex(
    (item) => Number(item.product_id) === Number(incoming.product_id),
  );

  if (index === -1) {
    return [...current, incoming];
  }

  const existing = current[index];
  const merged = {
    ...existing,
    probability_pct: Math.max(
      Number(existing.probability_pct || 0),
      Number(incoming.probability_pct || 0),
    ),
    sources: Array.from(
      new Set([...(existing.sources || []), ...(incoming.sources || [])]),
    ),
    reasons: Array.from(
      new Set([...(existing.reasons || []), ...(incoming.reasons || [])]),
    ),
  };

  return current.map((item, itemIndex) =>
    itemIndex === index ? merged : item,
  );
}

function buildSuggestedCustomerBasket(data) {
  if (!data) return [];

  let basket = [];
  const predictions = data?.next_basket?.predictions || [];
  const reorderSections = data?.reorder_intelligence?.sections || {};

  predictions.slice(0, 3).forEach((item) => {
    const normalized = normalizeCustomer360BasketItem(
      item,
      "ML Prediction",
      `Rank #${item.rank} next-basket prediction`,
      item.predicted_probability_pct,
    );

    if (normalized) {
      basket = mergeCustomer360BasketItem(basket, normalized);
    }
  });

  [
    ["overdue", "Overdue reorder-cycle signal"],
    ["due_now", "Due-now reorder-cycle signal"],
  ].forEach(([sectionKey, reason]) => {
    (reorderSections?.[sectionKey] || []).forEach((item) => {
      const normalized = normalizeCustomer360BasketItem(
        item,
        "Reorder",
        reason,
        item.purchase_probability_pct,
      );

      if (normalized) {
        basket = mergeCustomer360BasketItem(basket, normalized);
      }
    });
  });

  return basket;
}

function countCustomer360BasketSources(items) {
  return (items || []).reduce((counts, item) => {
    (item.sources || []).forEach((source) => {
      counts[source] = (counts[source] || 0) + 1;
    });

    return counts;
  }, {});
}

function customer360SourceClass(source) {
  return String(source || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildCustomerRadarPoints(behaviorEntries) {
  const centerX = 160;
  const centerY = 145;
  const radius = 88;

  const labels = [
    { x: 160, y: 20, anchor: "middle" },
    { x: 294, y: 107, anchor: "end" },
    { x: 247, y: 270, anchor: "middle" },
    { x: 73, y: 270, anchor: "middle" },
    { x: 26, y: 107, anchor: "start" },
  ];

  const points = behaviorEntries.map(([key, label, rawValue], index) => {
    const value = clampPercent(rawValue);
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5;
    const r = radius * (value / 100);

    return {
      key,
      label,
      value,
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
    };
  });

  const axes = behaviorEntries.map(([key], index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5;

    return {
      key,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });

  return {
    points,
    axes,
    labels: behaviorEntries.map(([key, label, rawValue], index) => ({
      key,
      label,
      value: rawValue,
      ...labels[index],
    })),
  };
}

function buildRadarPolygon(level) {
  const centerX = 160;
  const centerY = 145;
  const radius = 88 * (Number(level) / 100);

  return Array.from({ length: 5 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    return `${x},${y}`;
  }).join(" ");
}

function formatPersonaName(value) {
  if (!value) return "—";

  return String(value)
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function personaDescription(value) {
  const descriptions = {
    "BALANCED SHOPPER": "Broad, stable shopping behavior",
    "CURIOUS EXPLORER": "Higher discovery tendency",
    "GROWING BASKET SHOPPER": "Expanding basket engagement",
    "LOYAL REPLENISHER": "Strong repeat-purchase behavior",
    "FREQUENT PLANNER": "Frequent and structured shopping",
  };

  return (
    descriptions[String(value || "").toUpperCase()] ||
    "Observed behavioral segment"
  );
}

function formatScore(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${number.toFixed(1)}/100`;
}

function buildRankChartPoints(ranks) {
  const items = (ranks || [])
    .map((rank) => ({
      rank: Number(rank.recommendation_rank),
      value: Number(rank.avg_purchase_probability_pct),
    }))
    .filter((item) => Number.isFinite(item.rank) && Number.isFinite(item.value))
    .sort((a, b) => a.rank - b.rank);

  const minY = 20;
  const maxY = 60;
  const left = 58;
  const right = 618;
  const top = 24;
  const bottom = 226;

  const xScale = (rank, index) => {
    if (items.length <= 1) {
      return (left + right) / 2;
    }

    const denominator = items[items.length - 1].rank - items[0].rank;

    if (denominator <= 0) {
      return left + ((right - left) * index) / (items.length - 1);
    }

    return left + ((rank - items[0].rank) / denominator) * (right - left);
  };

  const yScale = (value) => {
    const clamped = Math.max(minY, Math.min(maxY, value));

    return bottom - ((clamped - minY) / (maxY - minY)) * (bottom - top);
  };

  return {
    yScale,
    points: items.map((item, index) => ({
      ...item,
      x: xScale(item.rank, index),
      y: yScale(item.value),
    })),
  };
}

function formatCandidateSource(value) {
  if (!value) return "—";

  const labels = {
    reorder: "Reorder",
    copurchase: "Co-purchase",
    aisletopurchase: "Aisle co-purchase",
    aisle: "Aisle affinity",
  };

  const normalized = String(value).trim().toLowerCase();

  return (
    labels[normalized] ||
    normalized
      .replace(/[_-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

function ProductBusinessProfile({ product }) {
  const metrics = [
    ["Purchase events", formatCompact(product.total_purchase_count)],
    ["Unique customers", formatCompact(product.unique_customer_count)],
    ["Customer reach", formatPercent(product.customer_penetration_pct)],
    ["Reorder rate", formatPercent(product.product_reorder_rate_pct)],
    ["Purchases / customer", formatNumber(product.purchases_per_customer, 2)],
    ["Department rank", `#${formatNumber(product.department_purchase_rank)}`],
  ];

  return (
    <div className="product-business-profile">
      <div className="product-profile-identity">
        <div>
          <span>{titleCase(product.department)}</span>
          <h4>{product.product_name}</h4>
        </div>

        <span
          className={`segment-badge ${segmentClass(product.product_segment)}`}
        >
          {formatSegment(product.product_segment)}
        </span>
      </div>

      <div className="product-business-focus">
        <span>Recommended business focus</span>
        <strong>{product.business_focus || "Monitor performance"}</strong>
      </div>

      <div className="product-profile-metrics">
        {metrics.map(([label, value]) => (
          <div key={label} className="product-profile-metric">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="product-signal-strip">
        <SignalPill label="Demand" value={product.demand_tier} />
        <SignalPill
          label="Repeat behavior"
          value={product.repeat_behavior_tier}
        />
        <SignalPill label="Reliability" value={product.metric_reliability} />
      </div>
    </div>
  );
}

function SignalPill({ label, value }) {
  return (
    <div className="product-signal-pill">
      <span>{label}</span>
      <strong>{formatSegment(value)}</strong>
    </div>
  );
}

function SegmentCard({ segment, totalProducts }) {
  const share =
    Number(totalProducts) > 0
      ? (Number(segment.product_count) / Number(totalProducts)) * 100
      : 0;

  return (
    <article
      className={`segment-card ${segmentClass(segment.product_segment)}`}
    >
      <div className="segment-card-top">
        <span className="segment-card-name">
          {formatSegment(segment.product_segment)}
        </span>
        <strong>{formatCompact(segment.product_count)}</strong>
      </div>

      <div className="segment-share-track">
        <span style={{ width: `${Math.max(1, Math.min(100, share))}%` }} />
      </div>

      <div className="segment-card-metrics">
        <div>
          <span>Portfolio share</span>
          <strong>{formatPercent(share)}</strong>
        </div>
        <div>
          <span>Avg reorder</span>
          <strong>{formatPercent(segment.avg_reorder_rate_pct)}</strong>
        </div>
        <div>
          <span>Avg purchases / product</span>
          <strong>{formatNumber(segment.avg_purchases_per_product, 1)}</strong>
        </div>
        <div>
          <span>Avg customer reach</span>
          <strong>{formatPercent(segment.avg_customer_reach_pct)}</strong>
        </div>
      </div>

      <div className="segment-business-focus">
        <span>Management focus</span>
        <strong>{segment.business_focus}</strong>
      </div>
    </article>
  );
}

function formatSegment(value) {
  if (!value) return "—";

  return String(value)
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function segmentClass(value) {
  return String(value || "balanced")
    .toLowerCase()
    .replace(/\//g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function MiniStat({ label, value }) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PagePreview({ kicker, title, text, items }) {
  return (
    <section className="page-preview">
      <div className="page-preview-badge">{kicker}</div>

      <h2>{title}</h2>
      <p>{text}</p>

      <div className="page-preview-grid">
        {items.map((item, index) => (
          <article key={item} className="page-preview-item">
            <span>0{index + 1}</span>
            <strong>{item}</strong>
          </article>
        ))}
      </div>

      <div className="page-preview-footer">
        <span className="status-indicator online" />
        API layer validated — page implementation comes next.
      </div>
    </section>
  );
}

function PlatformLoading() {
  return (
    <section className="platform-loading">
      <div className="platform-loader">
        <span />
        <span />
        <span />
      </div>

      <div>
        <strong>Loading Retail Intelligence</strong>
        <p>
          Connecting to the FastAPI serving layer and assembling executive
          metrics.
        </p>
      </div>
    </section>
  );
}

function NavIcon({ type }) {
  if (type === "overview") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </svg>
    );
  }

  if (type === "products") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </svg>
    );
  }

  if (type === "recommendations") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
        <path d="m5.6 5.6 2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    );
  }

  if (type === "customers") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.7-3.3 2.6-5 5.5-5s4.8 1.7 5.5 5" />
        <circle cx="17" cy="9" r="2.2" />
        <path d="M15 14.5c2.8-.5 4.7 1 5.5 4.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.8-4.1 3-6.2 6.5-6.2s5.7 2.1 6.5 6.2" />
      <path d="M4 4h3M17 4h3M4 20h3M17 20h3" />
    </svg>
  );
}

function formatCompact(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: number >= 1_000_000 ? 1 : 2,
  }).format(number);
}

function formatNumber(value, digits = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("en", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(number);
}

function formatPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${number.toFixed(1)}%`;
}

function clampPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, number));
}

function titleCase(value) {
  if (!value) return "—";

  return String(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default App;
