import { useEffect, useMemo, useState } from "react";
import "./App.css";

import {
  getReadiness,
  getRetailProduct,
  getTopProducts,
  loadExecutiveOverview,
  loadProductIntelligence,
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
    label: "Products",
    shortLabel: "Sales & repeat buying",
    icon: "products",
  },
  {
    id: "recommendations",
    label: "Recommendations",
    shortLabel: "ML predictions & performance",
    icon: "recommendations",
  },
  {
    id: "customers",
    label: "Customer Insights",
    shortLabel: "Shopping habits",
    icon: "customers",
  },
  {
    id: "customer360",
    label: "Customer 360",
    shortLabel: "One customer view",
    icon: "customer360",
  },
];

const PAGE_META = {
  overview: {
    eyebrow: "STORE OVERVIEW",
    title: "Store Overview",
    description:
      "A quick view of products, recommendations and customer shopping in one place.",
  },
  products: {
    eyebrow: "PRODUCTS",
    title: "Products",
    description:
      "See what sells, what customers buy again, and which products need attention.",
  },
  recommendations: {
    eyebrow: "RECOMMENDATIONS",
    title: "Recommendations",
    description:
      "See how the recommendation model is performing and where its suggestions come from.",
  },
  customers: {
    eyebrow: "CUSTOMERS",
    title: "Customer Insights",
    description:
      "See common shopper types, shopping habits, basket patterns and favorite departments.",
  },
  customer360: {
    eyebrow: "CUSTOMER VIEW",
    title: "Customer 360",
    description:
      "Open one customer to see predicted next items, buy-again timing, shopping habits and suggested actions.",
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
    <div className={`retail-platform ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
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
              <span>
                {readiness?.database?.provider || "Neon PostgreSQL"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="theme-switch"
            onClick={toggleTheme}
            aria-label={
              theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
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
                <RecommendationIntelligencePage onNavigate={setActivePage} />
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
      label: "Products tracked",
      value: formatCompact(retail.products_analyzed),
      detail: `${formatNumber(retail.departments_analyzed)} departments`,
      tone: "green",
    },
    {
      label: "Purchases",
      value: formatCompact(retail.total_purchase_events),
      detail: "Observed purchase events",
      tone: "blue",
    },
    {
      label: "Suggestions made",
      value: formatCompact(recommendations.recommendations_generated),
      detail: `${formatNumber(recommendations.customers_served)} customers`,
      tone: "violet",
    },
    {
      label: "Customer profiles",
      value: formatCompact(customers.customers_profiled),
      detail: "Customers with shopping profiles",
      tone: "amber",
    },
  ];

  return (
    <div className="overview-page">
      <section className="overview-hero">
        <div className="overview-hero-copy">
          <span className="hero-pill">Store overview</span>

          <h2>
            One place to see
            <span> how the store is doing.</span>
          </h2>

          <p>
            Start here for a quick summary. Open Products, Recommendations or
            Customer Insights when you want more detail.
          </p>
        </div>

        <div className="overview-hero-highlight">
          <span>Top product</span>
          <strong>{retail.top_product?.name || "Banana"}</strong>
          <p>{formatCompact(retail.top_product?.purchase_count)} purchases</p>

          <div className="highlight-divider" />

          <span>Top department</span>
          <strong>{titleCase(retail.top_department?.name || "produce")}</strong>
          <p>{formatCompact(retail.top_department?.purchase_count)} purchases</p>
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
    </div>
  );
}


function ProductIntelligencePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [topProducts, setTopProducts] = useState([]);
  const [topProductsLoading, setTopProductsLoading] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productDetail, setProductDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const productDashboardUrl = String(
    import.meta.env.VITE_DATABRICKS_PRODUCT_DASHBOARD_EMBED_URL ||
      import.meta.env.VITE_DATABRICKS_DASHBOARD_EMBED_URL ||
      "",
  ).trim();

  useEffect(() => {
    const controller = new AbortController();

    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        const result = await loadProductIntelligence({
          limit: 50,
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
            "Unable to load product data. Make sure the FastAPI backend is running.",
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
    setProductQuery("");
    setTopProductsLoading(true);
    setDetailError("");

    try {
      const result = await getTopProducts({
        limit: 50,
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
      setDetailError(err?.message || "Unable to filter products.");
    } finally {
      setTopProductsLoading(false);
    }
  }

  async function handleProductSelect(product) {
    if (!product) return;

    setSelectedProductId(product.product_id);
    setProductDetail(product);
    setProductQuery(product.product_name || "");
    setDetailLoading(true);
    setDetailError("");

    try {
      const detail = await getRetailProduct(product.product_id);
      setProductDetail(detail);
    } catch (err) {
      console.error(err);
      setDetailError(err?.message || "Unable to load product details.");
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
          <strong>Unable to load products</strong>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  const departments = data?.departments?.departments || [];
  const normalizedQuery = productQuery.trim().toLowerCase();
  const matchingProducts = topProducts
    .filter((product) => {
      if (!normalizedQuery) return true;
      return String(product.product_name || "")
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .slice(0, 8);

  return (
    <div className="product-intelligence-page simplified-business-page">
      <DatabricksDashboardSection
        url={productDashboardUrl}
        kicker="LIVE DATABRICKS DASHBOARD"
        title="Product performance"
        description="Use the dashboard for the store-wide picture: top products, repeat buying, product groups and department activity."
        openLabel="Open product dashboard ↗"
      />

      <section className="product-panel product-finder-panel">
        <div className="product-panel-heading product-detail-heading">
          <div>
            <span className="panel-kicker">PRODUCT FINDER</span>
            <h3>Find a product and open its details</h3>
            <p>
              The dashboard shows the overall picture. This tool lets you inspect one
              product without repeating the dashboard charts.
            </p>
          </div>

          {detailLoading && <span className="detail-loading-label">Loading…</span>}
        </div>

        <div className="product-finder-layout">
          <div className="product-finder-search-column">
            <div className="product-finder-controls">
              <label className="product-search-control">
                <span>Search product</span>
                <div className="product-search-box">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="m16 16 4 4" />
                  </svg>
                  <input
                    type="search"
                    value={productQuery}
                    onChange={(event) => setProductQuery(event.target.value)}
                    placeholder="Try banana, milk, avocado…"
                    autoComplete="off"
                  />
                  {productQuery && (
                    <button
                      type="button"
                      className="product-search-clear"
                      onClick={() => setProductQuery("")}
                      aria-label="Clear product search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </label>

              <label className="department-filter-control product-finder-department">
                <span>Department</span>
                <select value={departmentFilter} onChange={handleDepartmentChange}>
                  <option value="">All departments</option>
                  {departments.map((department) => (
                    <option key={department.department} value={department.department}>
                      {titleCase(department.department)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="product-search-results-header">
              <span>{normalizedQuery ? "Search results" : "Quick picks"}</span>
              <small>
                {topProductsLoading
                  ? "Updating…"
                  : `${matchingProducts.length} shown`}
              </small>
            </div>

            <div className={`product-search-results ${topProductsLoading ? "is-loading" : ""}`}>
              {matchingProducts.map((product) => (
                <button
                  type="button"
                  key={product.product_id}
                  className={
                    Number(selectedProductId) === Number(product.product_id)
                      ? "product-search-result selected"
                      : "product-search-result"
                  }
                  onClick={() => handleProductSelect(product)}
                >
                  <div>
                    <strong>{product.product_name}</strong>
                    <span>
                      {titleCase(product.department)} · {formatSegment(product.product_segment)}
                    </span>
                  </div>
                  <div className="product-search-result-side">
                    <strong>{formatCompact(product.total_purchase_count)}</strong>
                    <span>purchases</span>
                  </div>
                </button>
              ))}

              {matchingProducts.length === 0 && (
                <div className="product-search-empty">
                  <strong>No matching product</strong>
                  <p>Try another name or change the department.</p>
                </div>
              )}
            </div>
          </div>

          <div className="product-finder-detail-column">
            {productDetail ? (
              <ProductBusinessProfile product={productDetail} />
            ) : (
              <div className="product-empty-state">
                Search for a product to see its details.
              </div>
            )}

            {detailError && <p className="product-inline-error">{detailError}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}


function DatabricksDashboardSection({
  url,
  kicker,
  title,
  description,
  openLabel = "Open in Databricks ↗",
}) {
  const [frameLoaded, setFrameLoaded] = useState(false);
  const cleanUrl = String(url || "").trim();
  const hasEmbed = /^https:\/\/[^\s]+\/embed\/dashboardsv3\//i.test(cleanUrl);

  useEffect(() => {
    setFrameLoaded(false);
  }, [cleanUrl]);

  return (
    <section className="embedded-dashboard-section">
      <div className="embedded-dashboard-heading">
        <div>
          <span className="panel-kicker">{kicker}</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        {hasEmbed && (
          <a
            className="analytics-open-databricks"
            href={cleanUrl}
            target="_blank"
            rel="noreferrer"
          >
            {openLabel}
          </a>
        )}
      </div>

      {hasEmbed ? (
        <div className={`embedded-dashboard-frame-shell ${frameLoaded ? "is-loaded" : "is-loading"}`}>
          {!frameLoaded && (
            <div className="embedded-dashboard-loading" aria-live="polite">
              <div className="embedded-dashboard-loading-mark">DB</div>
              <div>
                <strong>Loading live dashboard</strong>
                <p>Databricks can take a few seconds to draw the charts.</p>
              </div>
            </div>
          )}
          <iframe
            className="embedded-dashboard-frame"
            src={cleanUrl}
            title={title}
            loading="eager"
            allow="clipboard-write; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setFrameLoaded(true)}
          />
        </div>
      ) : (
        <div className="embedded-dashboard-empty">
          <strong>Dashboard not connected yet</strong>
          <p>Add the Databricks embed URL to <code>frontend/.env.local</code>.</p>
        </div>
      )}
    </section>
  );
}


function RecommendationIntelligencePage({ onNavigate }) {
  const recommendationDashboardUrl = String(
    import.meta.env.VITE_DATABRICKS_RECOMMENDATION_DASHBOARD_EMBED_URL ||
      import.meta.env.VITE_DATABRICKS_DASHBOARD_EMBED_URL ||
      "",
  ).trim();

  const [customers, setCustomers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(21);
  const [modelData, setModelData] = useState(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingModel, setLoadingModel] = useState(true);
  const [modelError, setModelError] = useState("");

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
            setSelectedUserId(Number(rows[0].user_id));
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

    async function loadModelExample() {
      try {
        setLoadingModel(true);
        setModelError("");
        setModelData(null);

        const result = await getCustomer360(selectedUserId, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setModelData(result);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;

        console.error(err);
        setModelData(null);
        setModelError(
          err?.message ||
            `Unable to load ML predictions for customer ${selectedUserId}.`,
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingModel(false);
        }
      }
    }

    loadModelExample();
    return () => controller.abort();
  }, [selectedUserId]);

  const predictions = modelData?.next_basket?.predictions || [];
  const topPredictions = predictions.slice(0, 5);
  const customerSummary = modelData?.customer_summary || {};
  const topPrediction = topPredictions[0] || null;

  const pipeline = [
    ["01", "Purchase history", "What this customer bought before"],
    ["02", "Candidate products", "Possible products are collected"],
    ["03", "Feature engineering", "Shopping signals become model inputs"],
    ["04", "ML scoring", "Each candidate gets a purchase probability"],
    ["05", "Ranking", "The strongest predictions move to the top"],
    ["06", "Customer action", "The ranked output is used in Customer 360"],
  ];

  return (
    <div className="recommendation-intelligence-page simplified-business-page ml-recommendation-page">
      <DatabricksDashboardSection
        url={recommendationDashboardUrl}
        kicker="LIVE DATABRICKS DASHBOARD"
        title="Recommendation performance"
        description="Use the dashboard to monitor recommendation volume, purchase likelihood, rank performance, departments and recommendation sources."
        openLabel="Open recommendation dashboard ↗"
      />

      <section className="ml-live-demo-panel">
        <div className="ml-live-demo-heading">
          <div>
            <span className="panel-kicker">ML MODEL IN ACTION</span>
            <h3>See what the next-basket model predicts for one customer</h3>
            <p>
              These are live model outputs served through Neon PostgreSQL and FastAPI —
              not values typed into the website.
            </p>
          </div>

          <label className="ml-customer-picker">
            <span>Choose customer</span>
            <select
              value={String(selectedUserId)}
              onChange={(event) => setSelectedUserId(Number(event.target.value))}
              disabled={loadingCustomers || customers.length === 0}
            >
              {!customers.some(
                (customer) => Number(customer.user_id) === Number(selectedUserId),
              ) && <option value={selectedUserId}>Customer {selectedUserId}</option>}

              {customers.map((customer) => (
                <option key={customer.user_id} value={customer.user_id}>
                  Customer {customer.user_id}
                </option>
              ))}
            </select>
          </label>
        </div>

        {modelError && (
          <div className="ml-demo-error">
            <strong>Could not load this customer's predictions.</strong>
            <span>{modelError}</span>
          </div>
        )}

        <div className="ml-live-demo-grid">
          <article className="ml-prediction-board">
            <div className="ml-prediction-board-heading">
              <div>
                <span>Customer #{selectedUserId}</span>
                <strong>Top next-basket predictions</strong>
              </div>
              <span className="ml-model-badge">NEXT-BASKET ML</span>
            </div>

            {loadingModel && !modelData ? (
              <div className="ml-demo-loading">
                <span />
                <strong>Loading model predictions…</strong>
              </div>
            ) : topPredictions.length > 0 ? (
              <div className="ml-prediction-list">
                {topPredictions.map((prediction) => (
                  <div className="ml-prediction-row" key={prediction.product_id}>
                    <div className="ml-prediction-rank">#{prediction.rank}</div>

                    <div className="ml-prediction-main">
                      <div className="ml-prediction-topline">
                        <div>
                          <strong>{prediction.product_name}</strong>
                          <span>
                            {titleCase(prediction.department)} · {titleCase(prediction.aisle)}
                          </span>
                        </div>
                        <strong className="ml-prediction-score">
                          {formatPercent(prediction.predicted_probability_pct)}
                        </strong>
                      </div>

                      <div className="ml-prediction-track">
                        <span
                          style={{
                            width: `${clampPercent(
                              prediction.predicted_probability_pct,
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="ml-prediction-meta">
                        <span>
                          Why suggested: {formatCandidateSource(prediction.candidate_source)}
                        </span>
                        <span>
                          {prediction.is_new_to_customer
                            ? "New for this customer"
                            : "Bought before"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ml-demo-empty">
                No next-basket predictions are available for this customer.
              </div>
            )}
          </article>

          <aside className="ml-output-card">
            <span className="panel-kicker">MODEL OUTPUT</span>
            <h3>{topPrediction?.product_name || "Waiting for prediction"}</h3>
            <p>
              {topPrediction
                ? `The model gives this product the highest chance of appearing in customer ${selectedUserId}'s next order.`
                : "Choose a customer to inspect the model output."}
            </p>

            <div className="ml-output-facts">
              <div>
                <span>Top purchase likelihood</span>
                <strong>
                  {formatPercent(topPrediction?.predicted_probability_pct)}
                </strong>
              </div>
              <div>
                <span>Predictions returned</span>
                <strong>{formatNumber(predictions.length)}</strong>
              </div>
              <div>
                <span>Shopper group</span>
                <strong>{formatPersonaName(customerSummary.persona)}</strong>
              </div>
              <div>
                <span>Top suggestion came from</span>
                <strong>{formatCandidateSource(topPrediction?.candidate_source)}</strong>
              </div>
            </div>

            <div className="ml-output-proof">
              <strong>What this proves</strong>
              <p>
                The website is consuming the prediction layer produced by the ML
                pipeline. React displays the result; it does not calculate the model
                score itself.
              </p>
            </div>

            <button type="button" onClick={() => onNavigate("customer360")}>
              Open full Customer 360 →
            </button>
          </aside>
        </div>
      </section>

      <section className="ml-pipeline-panel">
        <div className="ml-pipeline-heading">
          <span className="panel-kicker">END-TO-END ML FLOW</span>
          <h3>What happens before a recommendation reaches the website</h3>
          <p>
            The interface is the last step. The prediction has already passed through
            data preparation, feature engineering, model scoring and ranking.
          </p>
        </div>

        <div className="ml-pipeline-flow">
          {pipeline.map(([number, title, text], index) => (
            <article key={number} className="ml-pipeline-step">
              <span>{number}</span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
              {index < pipeline.length - 1 && <b aria-hidden="true">→</b>}
            </article>
          ))}
        </div>
      </section>

      <section className="recommendation-term-strip">
        <div>
          <strong>Purchase likelihood</strong>
          <span>The probability produced by the model for a customer-product pair.</span>
        </div>
        <div>
          <strong>Rank</strong>
          <span>The strongest predicted products are placed first.</span>
        </div>
        <div>
          <strong>Why suggested</strong>
          <span>The candidate source that brought the product into the scoring set.</span>
        </div>
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
            "Unable to load customer insights. Make sure the FastAPI backend is running.",
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
          <strong>Unable to load customer insights</strong>
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
      detail: "Customers with a Shopping DNA profile",
      tone: "green",
    },
    {
      label: "Average basket size",
      value: formatNumber(overview.avg_basket_size, 1),
      detail: "Average items in each order",
      tone: "blue",
    },
    {
      label: "Days between orders",
      value: formatNumber(overview.avg_days_between_orders, 1),
      detail: "Average time between orders",
      tone: "violet",
    },
    {
      label: "Largest shopper group",
      value: formatPercent(dominantPersona?.share_pct),
      detail: formatPersonaName(dominantPersona?.shopping_persona),
      tone: "amber",
    },
  ];

  return (
    <div className="customer-intelligence-page">
      <section className="customer-intelligence-hero">
        <div className="customer-intelligence-hero-copy">
          <span className="hero-pill">Customer insights</span>

          <h2>
            See how your customers shop and
            <span> what they prefer.</span>
          </h2>

          <p>
            This page groups customers by shopping style and shows their common habits,
            order rhythm and favorite departments.
          </p>
        </div>

        <div className="customer-hero-signal">
          <span>Largest shopper group</span>
          <strong>{formatPersonaName(dominantPersona?.shopping_persona)}</strong>
          <p>
            {formatCompact(dominantPersona?.customer_count)} customers · {" "}
            {formatPercent(dominantPersona?.share_pct)} of profiled customers
          </p>

          <div className="highlight-divider" />

          <span>Strongest shopping habit</span>
          <strong>{dominantBehavior?.[1] || "—"}</strong>
          <p>
            {formatScore(dominantBehavior?.[2])} average score
          </p>
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
              <span className="panel-kicker">SHOPPER GROUPS</span>
              <h3>Main shopper groups</h3>
              <p>
                See the main shopper types and how many customers belong to each group.
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
                        <span>{personaDescription(persona.shopping_persona)}</span>
                      </div>

                      <div className="persona-distribution-metrics">
                        <strong>{formatPercent(persona.share_pct)}</strong>
                        <span>{formatCompact(persona.customer_count)} customers</span>
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
              <span className="panel-kicker">SHOPPING HABITS</span>
              <h3>Average shopping habits</h3>
              <p>
                These five scores summarize how customers usually shop.
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
                  points={radar.points.map((point) => `${point.x},${point.y}`).join(" ")}
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
              <span>Shopping frequency</span>
              <strong>{formatNumber(overview.avg_days_between_orders, 1)}</strong>
              <small>days between orders</small>
            </div>
          </div>
        </article>
      </section>

      <section className="customer-intelligence-panel customer-department-panel">
        <div className="customer-intelligence-panel-heading">
          <div>
            <span className="panel-kicker">FAVORITE DEPARTMENTS</span>
            <h3>Departments customers prefer most</h3>
            <p>
              See which departments are most often a customer's favorite.
            </p>
          </div>
        </div>

        <div className="customer-department-list">
          {departments.map((department, index) => {
            const width =
              ((Number(department.customer_count) || 0) / maxDepartmentCount) * 100;

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
                        <span>Share of customers</span>
                        <strong>{formatPercent(department.customer_share_pct)}</strong>
                      </div>
                      <div>
                        <span>Avg preference</span>
                        <strong>{formatPercent(department.avg_affinity_pct)}</strong>
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
            <strong>Largest shopper group</strong>
            <p>
              {formatPersonaName(dominantPersona?.shopping_persona)} represents
              {" "}{formatPercent(dominantPersona?.share_pct)} of the profiled base.
            </p>
          </div>
        </article>

        <article>
          <span>03</span>
          <div>
            <strong>Favorite department</strong>
            <p>
              {titleCase(strongestDepartment?.department)} is the most common
              favorite department, covering {" "}
              {formatPercent(strongestDepartment?.customer_share_pct)} of customers.
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

    setBasketItems((current) => mergeCustomer360BasketItem(current, normalized));
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
  const insightItems = Object.entries(dna?.insights || {}).filter(
    ([, value]) => Boolean(value),
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
      label: "Past orders",
      value: formatNumber(summary.prior_orders ?? history.prior_orders),
      detail: `${formatNumber(summary.unique_products ?? history.unique_products)} unique products observed`,
      tone: "green",
    },
    {
      label: "Top prediction",
      value: formatPercent(summary.top_prediction_probability_pct),
      detail: topPrediction?.product_name || "Most likely next product",
      tone: "blue",
    },
    {
      label: "Buy-again reminders",
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
      detail: `${formatPercent(topDepartment?.affinity_pct)} preference`,
      tone: "amber",
    },
  ];

  const views = [
    { id: "snapshot", label: "Snapshot", short: "Customer at a glance" },
    {
      id: "next-basket",
      label: "Next Basket",
      short: `ML · ${formatNumber(predictions.length)} predictions`,
    },
    {
      id: "reorder",
      label: "Buy Again",
      short: `Timing · ${formatNumber(attentionCount)} need attention`,
    },
    {
      id: "recommendations",
      label: "Recommendations",
      short: `ML · ${formatNumber(recommendationItems.length)} served`,
    },
    {
      id: "basket",
      label: "Suggested Basket",
      short: `ML + signals · ${formatNumber(basketItems.length)} items`,
    },
    {
      id: "dna",
      label: "Shopping Habits",
      short: `Behavior · ${formatPersonaName(dna?.profile?.dominant_trait)}`,
    },
  ];

  return (
    <div className="customer360-page customer360-v2">
      <section className="customer360-toolbar customer360-toolbar-v2">
        <div className="customer360-toolbar-copy">
          <span className="panel-kicker">CUSTOMER LOOKUP</span>
          <strong>Find a customer</strong>
          <p>
            See purchase history, predicted next items, buy-again timing,
            recommendations and shopping habits in one place.
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
                (customer) => Number(customer.user_id) === Number(selectedUserId),
              ) && <option value={selectedUserId}>Customer {selectedUserId}</option>}

              {customers.map((customer) => (
                <option key={customer.user_id} value={customer.user_id}>
                  Customer {customer.user_id} · {customer.recommendation_count} suggestions
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
        <div className="customer360-refreshing">Refreshing customer intelligence…</div>
      )}

      {data && (
        <>
          <section className="customer360-profile-strip">
            <div className="customer360-profile-strip-main">
              <span className="customer360-number">Customer #{selectedUserId}</span>
              <div>
                <strong>{formatPersonaName(summary.persona)}</strong>
                <p>{summary.headline || dna.summary || dna.persona_description}</p>
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

          <nav className="customer360-view-tabs" aria-label="Customer intelligence views">
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
                  <span className="hero-pill">Customer 360 · #{selectedUserId}</span>
                  <h2>
                    {formatPersonaName(summary.persona)}
                    <span> at a glance.</span>
                  </h2>
                  <p>
                    {summary.headline || dna.summary || dna.persona_description ||
                      "Unified customer intelligence is available for this customer."}
                  </p>

                  <div className="customer360-hero-tags">
                    <span>
                      {formatPersonaName(dna?.profile?.dominant_trait)} strongest habit
                    </span>
                    <span>
                      {formatPersonaName(history.loyalty_profile)} loyalty
                    </span>
                    <span>{titleCase(summary.favorite_department)} preference</span>
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
                      {formatPercent(topPrediction?.predicted_probability_pct)} chance
                    </small>
                  </div>

                  <div className="customer360-basket-note-row">
                    <span>Buy-again reminders</span>
                    <strong>
                      {attentionCount} item{attentionCount === 1 ? "" : "s"}
                    </strong>
                    <small>{reorder?.planner_summary || "Nothing urgent right now."}</small>
                  </div>

                  <div className="customer360-basket-note-row">
                    <span>Favorite department</span>
                    <strong>{titleCase(summary.favorite_department)}</strong>
                    <small>{formatPercent(topDepartment?.affinity_pct)} preference</small>
                  </div>
                </aside>
              </section>

              <section className="executive-kpi-grid customer360-kpi-grid customer360-kpi-grid-v2">
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

              <section className="customer360-snapshot-lanes">
                <article className="customer360-snapshot-lane prediction">
                  <span className="customer360-lane-number">01</span>
                  <div>
                    <span className="panel-kicker">NEXT BASKET</span>
                    <strong>{topPrediction?.product_name || "No prediction"}</strong>
                    <p>
                      The model gives it a {formatPercent(
                        topPrediction?.predicted_probability_pct,
                      )} chance.
                    </p>
                  </div>
                  <button type="button" onClick={() => setActiveView("next-basket")}>
                    View predictions
                  </button>
                </article>

                <article className="customer360-snapshot-lane reorder">
                  <span className="customer360-lane-number">02</span>
                  <div>
                    <span className="panel-kicker">BUY AGAIN</span>
                    <strong>
                      {attentionCount} item{attentionCount === 1 ? "" : "s"} need attention
                    </strong>
                    <p>{reorder?.planner_summary || "No urgent reorder signal."}</p>
                  </div>
                  <button type="button" onClick={() => setActiveView("reorder")}>
                    View timing
                  </button>
                </article>

                <article className="customer360-snapshot-lane dna">
                  <span className="customer360-lane-number">03</span>
                  <div>
                    <span className="panel-kicker">SHOPPING DNA</span>
                    <strong>{formatPersonaName(dna?.profile?.dominant_trait)}</strong>
                    <p>
                      Strongest shopping habit for this customer.
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
                  <span className="panel-kicker">NEXT-BASKET ML MODEL</span>
                  <h3>What this customer is most likely to purchase next</h3>
                  <p>
                    These are the products the model thinks this customer is most likely to buy next.
                  </p>
                </div>
                <div className="customer360-panel-badge">
                  {formatNumber(nextBasket.total_predictions)} predictions
                </div>
              </div>

              <div className="customer360-prediction-list customer360-prediction-list-v2">
                {predictions.map((item) => (
                  <article className="customer360-prediction-row" key={item.product_id}>
                    <div className="customer360-rank">#{item.rank}</div>
                    <div className="customer360-row-main">
                      <div className="customer360-row-topline">
                        <div>
                          <strong>{item.product_name}</strong>
                          <span>
                            {titleCase(item.department)} · {titleCase(item.aisle)}
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
                        <span>Suggested because: {formatCandidateSource(item.candidate_source)}</span>
                        <span>
                          {item.is_new_to_customer
                            ? "New to customer"
                            : "Previously purchased"}
                        </span>
                        <button
                          type="button"
                          className={`customer360-inline-basket-button ${
                            basketProductIds.has(Number(item.product_id)) ? "added" : ""
                          }`}
                          onClick={() =>
                            addSignalToBasket(
                              item,
                              "ML Prediction",
                              `Rank #${item.rank} next-basket prediction`,
                              item.predicted_probability_pct,
                            )
                          }
                          disabled={basketProductIds.has(Number(item.product_id))}
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
                  <span className="panel-kicker">BUY AGAIN TIMING</span>
                  <h3>When this customer may need to buy products again</h3>
                  <p>
                    See which products are overdue, due soon, or still early based on this customer's usual buying pattern.
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
                    <strong>{formatNumber(reorder?.status_counts?.[key] || 0)}</strong>
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
                            {titleCase(item.department)} · {titleCase(item.aisle)}
                          </span>
                        </div>
                        <div className="customer360-row-actions">
                          <span className={`customer360-status-badge ${item.sectionKey}`}>
                            {item.sectionLabel}
                          </span>
                          <button
                            type="button"
                            className={`customer360-inline-basket-button ${
                              basketProductIds.has(Number(item.product_id)) ? "added" : ""
                            }`}
                            onClick={() =>
                              addSignalToBasket(
                                item,
                                "Reorder",
                                `${item.sectionLabel} reorder-cycle signal`,
                                item.purchase_probability_pct,
                              )
                            }
                            disabled={basketProductIds.has(Number(item.product_id))}
                          >
                            {basketProductIds.has(Number(item.product_id))
                              ? "In basket"
                              : "Add"}
                          </button>
                        </div>
                      </div>

                      <div className="customer360-reorder-metrics">
                        <div>
                          <span>Orders since last buy</span>
                          <strong>{formatNumber(item.orders_since_last_purchase)}</strong>
                        </div>
                        <div>
                          <span>Usually every</span>
                          <strong>{formatNumber(item.usual_order_gap, 1)}</strong>
                        </div>
                        <div>
                          <span>Repeat purchase rate</span>
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
                  No reorder-cycle rows are currently surfaced for this customer.
                </div>
              )}
            </section>
          )}

          {activeView === "recommendations" && (
            <section className="customer360-view-panel customer360-panel customer360-focus-panel">
              <div className="customer360-panel-heading">
                <div>
                  <span className="panel-kicker">ML RECOMMENDATIONS</span>
                  <h3>Why these products are recommended</h3>
                  <p>
                    Each product shows why it was suggested and what action to take.
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
                      <span className={`customer360-section-badge ${item.sectionKey}`}>
                        {item.sectionLabel}
                      </span>
                      <strong>{formatPercent(item.purchase_probability_pct)}</strong>
                    </div>

                    <h4>{item.product_name}</h4>
                    <p className="customer360-recommendation-category">
                      {titleCase(item.department)} · {titleCase(item.aisle)}
                    </p>

                    <div className="customer360-recommendation-meta">
                      <div>
                        <span>Why suggested</span>
                        <strong>{formatPersonaName(item.candidate_source)}</strong>
                      </div>
                      <div>
                        <span>Action</span>
                        <strong>{item.action || "Review"}</strong>
                      </div>
                    </div>

                    <p className="customer360-reason">{item.why_recommended}</p>

                    <button
                      type="button"
                      className={`customer360-inline-basket-button recommendation ${
                        basketProductIds.has(Number(item.product_id)) ? "added" : ""
                      }`}
                      onClick={() =>
                        addSignalToBasket(
                          item,
                          item.sectionKey === "discover" ? "Discovery" : "Recommendation",
                          item.sectionLabel || item.action || "Recommendation signal",
                          item.purchase_probability_pct,
                        )
                      }
                      disabled={basketProductIds.has(Number(item.product_id))}
                    >
                      {basketProductIds.has(Number(item.product_id))
                        ? "Already in basket"
                        : "Add to suggested basket"}
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
                  <span className="panel-kicker">SUGGESTED BASKET</span>
                  <h3>Suggested basket for this customer</h3>
                  <p>
                    It starts with the top three predicted products and anything that is overdue or due now.
                  </p>
                </div>

                <div className="customer360-basket-heading-actions">
                  <div className="customer360-panel-badge">
                    {formatNumber(basketItems.length)} items
                  </div>
                  <button type="button" onClick={resetSuggestedBasket}>
                    Reset basket
                  </button>
                </div>
              </div>

              <div className="customer360-action-basket-layout">
                <div className="customer360-pick-list">
                  <div className="customer360-pick-list-header">
                    <div>
                      <span className="panel-kicker">BASKET ITEMS</span>
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
                                  {titleCase(item.department)} · {titleCase(item.aisle)}
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
                      <strong>No products are currently in the action basket.</strong>
                      <p>
                        Reset the suggestion or add products from Next Basket, Reorder
                        Cycle or Recommendations.
                      </p>
                      <button type="button" onClick={resetSuggestedBasket}>
                        Restore suggested basket
                      </button>
                    </div>
                  )}
                </div>

                <aside className="customer360-basket-receipt">
                  <div className="customer360-receipt-ticket">
                    <span className="customer360-receipt-label">SUGGESTED BASKET</span>
                    <strong>#{selectedUserId}</strong>
                    <small>Products to consider</small>
                  </div>

                  <div className="customer360-receipt-line">
                    <span>Total items</span>
                    <strong>{formatNumber(basketItems.length)}</strong>
                  </div>
                  <div className="customer360-receipt-line">
                    <span>Model predictions</span>
                    <strong>{formatNumber(basketSourceCounts["ML Prediction"] || 0)}</strong>
                  </div>
                  <div className="customer360-receipt-line">
                    <span>Buy-again items</span>
                    <strong>{formatNumber(basketSourceCounts.Reorder || 0)}</strong>
                  </div>
                  <div className="customer360-receipt-line">
                    <span>Other suggestions</span>
                    <strong>
                      {formatNumber(
                        (basketSourceCounts.Recommendation || 0) +
                          (basketSourceCounts.Discovery || 0),
                      )}
                    </strong>
                  </div>
                  <div className="customer360-receipt-line total">
                    <span>Avg. purchase chance</span>
                    <strong>
                      {basketItems.length > 0
                        ? formatPercent(basketAverageProbability)
                        : "—"}
                    </strong>
                  </div>

                  <div className="customer360-basket-rules">
                    <span className="panel-kicker">HOW IT IS BUILT</span>
                    <ol>
                      <li>Take the three highest-ranked next-basket predictions.</li>
                      <li>Add every product currently overdue or due now.</li>
                      <li>Merge duplicate products and keep every supporting signal.</li>
                    </ol>
                  </div>

                  <p className="customer360-basket-note-copy">
                    This basket combines the strongest signals from the prediction, buy-again and recommendation sections.
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
                    {dna?.profile?.headline || formatPersonaName(dna?.profile?.persona)}
                  </h3>
                  <p>
                    {dna.summary || dna.persona_description ||
                      "Shopping habits and favorite categories for this customer."}
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
                    <span>Shopper type</span>
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
                        <span>Basket trend</span>
                        <strong>{formatPersonaName(rhythm.basket_momentum)}</strong>
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
                          <strong>{formatPercent(department.affinity_pct)}</strong>
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
              Serving record: target order {activeCustomer.target_order_id} · {activeCustomer.recommendation_count} recommendation rows available.
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

  return descriptions[String(value || "").toUpperCase()] || "Observed behavioral segment";
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
    .filter(
      (item) =>
        Number.isFinite(item.rank) &&
        Number.isFinite(item.value),
    )
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

    const denominator =
      items[items.length - 1].rank - items[0].rank;

    if (denominator <= 0) {
      return left + ((right - left) * index) / (items.length - 1);
    }

    return (
      left +
      ((rank - items[0].rank) / denominator) *
        (right - left)
    );
  };

  const yScale = (value) => {
    const clamped = Math.max(minY, Math.min(maxY, value));

    return (
      bottom -
      ((clamped - minY) / (maxY - minY)) *
        (bottom - top)
    );
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
    aisle: "Aisle preference",
  };

  const normalized = String(value).trim().toLowerCase();

  return (
    labels[normalized] ||
    normalized
      .replace(/[_-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1),
      )
      .join(" ")
  );
}

function ProductBusinessProfile({ product }) {
  const metrics = [
    ["Purchases", formatCompact(product.total_purchase_count)],
    ["Customers", formatCompact(product.unique_customer_count)],
    ["Customer reach", formatPercent(product.customer_penetration_pct)],
    ["Repeat purchase rate", formatPercent(product.product_reorder_rate_pct)],
    ["Avg purchases / customer", formatNumber(product.purchases_per_customer, 2)],
    ["Rank in department", `#${formatNumber(product.department_purchase_rank)}`],
  ];

  return (
    <div className="product-business-profile">
      <div className="product-profile-identity">
        <div>
          <span>{titleCase(product.department)}</span>
          <h4>{product.product_name}</h4>
        </div>

        <span className={`segment-badge ${segmentClass(product.product_segment)}`}>
          {formatSegment(product.product_segment)}
        </span>
      </div>

      <div className="product-business-focus">
        <span>Action</span>
        <strong>{formatBusinessFocus(product.business_focus)}</strong>
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
        <SignalPill label="Sales level" value={product.demand_tier} />
        <SignalPill label="Repeat buying" value={product.repeat_behavior_tier} />
        <SignalPill label="Data confidence" value={product.metric_reliability} />
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
    <article className={`segment-card ${segmentClass(segment.product_segment)}`}>
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

  const labels = {
    "CORE STAPLE": "Core product",
    "HIGH REACH / LOW REPEAT": "Popular, low repeat",
    "LOW TRACTION": "Low activity",
    "NICHE LOYAL": "Niche favorite",
    "INSUFFICIENT HISTORY": "Not enough history",
    "BALANCED": "Balanced",
  };

  const normalized = String(value).trim().toUpperCase();

  return (
    labels[normalized] ||
    String(value)
      .toLowerCase()
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

function formatBusinessFocus(value) {
  const labels = {
    "Protect core demand": "Keep well stocked",
    "Investigate repeat-purchase opportunity": "Encourage repeat purchases",
    "Monitor product engagement": "Watch product interest",
    "Nurture loyal niche demand": "Support loyal shoppers",
    "Monitor performance": "Keep monitoring",
    "Build more history": "Wait for more data",
  };

  return labels[String(value || "")] || value || "Keep monitoring";
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
        <strong>Loading store data</strong>
        <p>
          Loading the latest data from the application API.
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

  if (type === "analytics") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
        <path d="m4 7 6-4 6 6 5-5" />
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
