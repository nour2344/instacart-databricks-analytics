import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";


/* ============================================================
   APP
============================================================ */

function App() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");

  const [assistant, setAssistant] = useState(null);
  const [nextBasket, setNextBasket] = useState(null);
  const [reorderPlanner, setReorderPlanner] = useState(null);

  const [shoppingDna, setShoppingDna] = useState(null);

  const [activeTab, setActiveTab] = useState("assistant");

  const [theme, setTheme] = useState(() => {
  const savedTheme =
    localStorage.getItem("instacart-theme");

  if (
    savedTheme === "light" ||
    savedTheme === "dark"
  ) {
    return savedTheme;
  }

  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [completedActions, setCompletedActions] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [selectedPredictions, setSelectedPredictions] = useState({});


  useEffect(() => {
  document.documentElement.setAttribute(
    "data-theme",
    theme
  );

  localStorage.setItem(
    "instacart-theme",
    theme
  );
}, [theme]);


function toggleTheme() {
  setTheme((currentTheme) =>
    currentTheme === "dark"
      ? "light"
      : "dark"
  );
  }
  
  /* ============================================================
     LOAD CUSTOMERS
  ============================================================ */

  useEffect(() => {
    async function loadCustomers() {
      try {
        setError("");

        const response = await fetch(`${API_URL}/api/customers?limit=100`);

        if (!response.ok) {
          throw new Error("Unable to load customers.");
        }

        const data = await response.json();

        setCustomers(data.customers || []);
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load customers. Make sure the FastAPI backend is running.",
        );
      }
    }

    loadCustomers();
  }, []);

  /* ============================================================
     LOAD CUSTOMER INTELLIGENCE
  ============================================================ */

  async function handleCustomerChange(event) {
    const userId = event.target.value;

    setSelectedCustomer(userId);

    setAssistant(null);
    setNextBasket(null);
    setReorderPlanner(null);
    setShoppingDna(null);

    setCompletedActions({});
    setCartItems([]);
    setIsCartOpen(false);
    setSelectedPredictions({});
    setError("");

    if (!userId) {
      return;
    }

    setLoading(true);

    try {
      const [
        assistantResponse,
        predictionResponse,
        reorderPlannerResponse,
        shoppingDnaResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/customers/${userId}/assistant`),

        fetch(`${API_URL}/api/customers/${userId}/next-basket`),
        fetch(`${API_URL}/api/customers/${userId}/reorder-planner`),

        fetch(`${API_URL}/api/customers/${userId}/shopping-dna`),
      ]);

      if (!assistantResponse.ok) {
        throw new Error(
          `Unable to load Shopping Assistant for customer ${userId}.`,
        );
      }

      if (!predictionResponse.ok) {
        throw new Error(
          `Unable to load Next Basket Prediction for customer ${userId}.`,
        );
      }

      if (!reorderPlannerResponse.ok && reorderPlannerResponse.status !== 404) {
        throw new Error(
          `Unable to load Reorder Planner for customer ${userId}.`,
        );
      }

      if (!shoppingDnaResponse.ok) {
        throw new Error(`Unable to load Shopping DNA for customer ${userId}.`);
      }

      const [
        assistantData,
        predictionData,
        reorderPlannerData,
        shoppingDnaData,
      ] = await Promise.all([
        assistantResponse.json(),
        predictionResponse.json(),

        reorderPlannerResponse.ok ? reorderPlannerResponse.json() : null,
        shoppingDnaResponse.json(),
      ]);

      const defaultPredictionSelection = {};

      (predictionData.predictions || []).slice(0, 4).forEach((prediction) => {
        defaultPredictionSelection[prediction.product_id] = true;
      });

      setSelectedPredictions(defaultPredictionSelection);
      setAssistant(assistantData);
      setNextBasket(predictionData);
      setReorderPlanner(reorderPlannerData);
      setShoppingDna(shoppingDnaData);
    } catch (err) {
      console.error(err);

      setError(err.message || "Unable to load customer intelligence.");
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     CLIENT ACTIONS
  ============================================================ */

  function normalizeCartItem(product, source = "shopping-assistant") {
    const probabilityPct = Number(
      product.predicted_probability_pct ??
        product.purchase_probability_pct ??
        Number(product.purchase_probability || 0) * 100,
    );

    return {
      product_id: product.product_id,
      product_name: product.product_name,
      aisle: product.aisle,
      department: product.department,

      source,

      probability_pct: Number.isFinite(probabilityPct) ? probabilityPct : 0,
    };
  }

  function addToCart(product, source = "shopping-assistant") {
    const cartItem = normalizeCartItem(product, source);

    setCartItems((previous) => {
      const alreadyExists = previous.some(
        (item) => item.product_id === cartItem.product_id,
      );

      if (alreadyExists) {
        return previous;
      }

      return [...previous, cartItem];
    });
  }

  function removeFromCart(productId) {
    setCartItems((previous) =>
      previous.filter((item) => item.product_id !== productId),
    );

    setCompletedActions((previous) => {
      const next = {
        ...previous,
      };

      if (next[productId] === "Add again" || next[productId] === "Try it") {
        delete next[productId];
      }

      return next;
    });
  }

  function clearCart() {
    setCartItems([]);

    setCompletedActions((previous) => {
      const next = {
        ...previous,
      };

      Object.keys(next).forEach((productId) => {
        if (next[productId] === "Add again" || next[productId] === "Try it") {
          delete next[productId];
        }
      });

      return next;
    });
  }

  function handleRecommendationAction(product, source = "shopping-assistant") {
    setCompletedActions((previous) => ({
      ...previous,
      [product.product_id]: product.action,
    }));

    if (product.action === "Add again" || product.action === "Try it") {
      addToCart(product, source);
    }
  }

  function togglePredictionSelection(productId) {
    setSelectedPredictions((previous) => ({
      ...previous,
      [productId]: !previous[productId],
    }));
  }

  function addSelectedPredictionsToCart() {
    const selectedProducts = (nextBasket?.predictions || []).filter(
      (prediction) => selectedPredictions[prediction.product_id],
    );

    setCartItems((previous) => {
      const existingIds = new Set(previous.map((item) => item.product_id));

      const newItems = selectedProducts
        .filter((prediction) => !existingIds.has(prediction.product_id))
        .map((prediction) => normalizeCartItem(prediction, "next-basket"));

      return [...previous, ...newItems];
    });

    setIsCartOpen(true);
  }

  /* ============================================================
     UI
  ============================================================ */

  return (
    <div className="app">
      {/* ========================================================
          HERO
      ======================================================== */}

      <header className="header">
        <div className="header-content">
          <div className="header-topbar">

  <p className="eyebrow">
    INSTACART INTELLIGENCE
  </p>


  <button
    type="button"
    className="theme-toggle"
    onClick={toggleTheme}
    aria-label={
      theme === "dark"
        ? "Switch to light mode"
        : "Switch to dark mode"
    }
  >

    <span className="theme-toggle-icon">
      {theme === "dark" ? "☀" : "☾"}
    </span>

    <span>
      {theme === "dark"
        ? "Light mode"
        : "Dark mode"}
    </span>

  </button>

</div>

          <h1>Smart Shopping Assistant</h1>

          <p className="subtitle">
             Predict what comes next, plan repeat purchases,
  discover relevant products and understand each
  customer's shopping behavior.
          </p>
        </div>
      </header>

      {/* ========================================================
          MAIN
      ======================================================== */}

      <main className="container">
        {/* ======================================================
            CUSTOMER SELECTOR
        ====================================================== */}

        <section className="customer-panel">
          <label htmlFor="customer">Select customer</label>

          <select
            id="customer"
            value={selectedCustomer}
            onChange={handleCustomerChange}
          >
            <option value="">Choose a customer</option>

            {customers.map((customer) => (
              <option key={customer.user_id} value={customer.user_id}>
                Customer {customer.user_id}
              </option>
            ))}
          </select>
        </section>

        {/* ======================================================
    WELCOME STATE
====================================================== */}

{!selectedCustomer && !loading && !error && (
  <section className="welcome-state">

    <div className="welcome-state-icon">
      ✦
    </div>

    <p className="eyebrow">
      CUSTOMER INTELLIGENCE
    </p>

    <h2>
      Select a customer to begin
    </h2>

    <p>
      Explore personalized recommendations,
      next-basket predictions, reorder timing
      and behavioral insights in one place.
    </p>

    <div className="welcome-capabilities">

      <span>
        AI recommendations
      </span>

      <span>
        Next-basket prediction
      </span>

      <span>
        Reorder intelligence
      </span>

      <span>
        Shopping DNA
      </span>

    </div>

  </section>
)}
        {/* ======================================================
            LOADING
        ====================================================== */}

     {loading && (
  <section className="loading-state">

    <div className="loading-spinner" />

    <div>

      <strong>
        Building customer intelligence
      </strong>

      <p>
        Loading predictions, recommendations,
        reorder timing and shopping behavior...
      </p>

    </div>

  </section>
)}

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
  <section className="app-error-state">

    <span className="app-error-icon">
      !
    </span>

    <div>

      <strong>
        We couldn't load this customer
      </strong>

      <p>
        {error}
      </p>

    </div>

  </section>
)}

        {/* ======================================================
            INTELLIGENCE EXPERIENCE
        ====================================================== */}

        {selectedCustomer &&
          !loading &&
          assistant &&
          nextBasket &&
          shoppingDna && (
            <>
              {/* ==================================================
                  TABS
              ================================================== */}

              <div className="intelligence-tabs">
                <button
                  type="button"
                  className={
                    activeTab === "assistant"
                      ? "tab-button active"
                      : "tab-button"
                  }
                  onClick={() => setActiveTab("assistant")}
                >
                  Shopping Assistant
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "prediction"
                      ? "tab-button active"
                      : "tab-button"
                  }
                  onClick={() => setActiveTab("prediction")}
                >
                  Next Basket Prediction
                </button>
                <button
                  type="button"
                  className={
                    activeTab === "reorder" ? "tab-button active" : "tab-button"
                  }
                  onClick={() => setActiveTab("reorder")}
                >
                  Reorder Planner
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "dna" ? "tab-button active" : "tab-button"
                  }
                  onClick={() => setActiveTab("dna")}
                >
                  My Insights
                </button>
              </div>

              {/* ==================================================
                  SHOPPING ASSISTANT
              ================================================== */}

              {activeTab === "assistant" && (
                <ShoppingAssistant
                  assistant={assistant}
                  completedActions={completedActions}
                  onAction={(product) =>
                    handleRecommendationAction(product, "shopping-assistant")
                  }
                />
              )}

              {/* ==================================================
                  NEXT BASKET
              ================================================== */}

              {activeTab === "prediction" && (
                <NextBasket
                  nextBasket={nextBasket}
                  selectedPredictions={selectedPredictions}
                  onTogglePrediction={togglePredictionSelection}
                  onAddSelected={addSelectedPredictionsToCart}
                  cartItems={cartItems}
                  onAddPrediction={(prediction) =>
                    addToCart(prediction, "next-basket")
                  }
                />
              )}
              {/* ==================================================
    REORDER PLANNER
================================================== */}

              {activeTab === "reorder" && (
                <ReorderPlanner
                  planner={reorderPlanner}
                  completedActions={completedActions}
                  onAction={(product) =>
                    handleRecommendationAction(product, "reorder-planner")
                  }
                />
              )}

              {/* ==================================================
                  SHOPPING DNA
              ================================================== */}

              {activeTab === "dna" && <ShoppingDNA shoppingDna={shoppingDna} />}
            </>
          )}
      </main>

      {/* ========================================================
          FLOATING SMART CART
      ======================================================== */}

      {selectedCustomer && !loading && (
        <>
          <button
            type="button"
            className="cart-floating-button"
            onClick={() => setIsCartOpen(true)}
          >
            <span>🛒</span>

            <span>Smart Basket</span>

            <strong>{cartItems.length}</strong>
          </button>

          <CartDrawer
            open={isCartOpen}
            items={cartItems}
            onClose={() => setIsCartOpen(false)}
            onRemove={removeFromCart}
            onClear={clearCart}
          />
        </>
      )}
    </div>
  );
}

/* ============================================================
   SMART CART
============================================================ */

function CartDrawer({
  open,
  items,
  onClose,
  onRemove,
  onClear,
}) {

  if (!open) {
    return null;
  }


  return (
    <>

      <button
        type="button"
        className="cart-backdrop"
        aria-label="Close cart"
        onClick={onClose}
      />


      <aside className="cart-drawer">

        <div className="cart-drawer-header">

          <div>

            <p className="story-kicker">
              SMART BASKET
            </p>

            <h2>
              Your cart
            </h2>

            <p>
              {items.length}{" "}
              {items.length === 1
                ? "product"
                : "products"}
            </p>

          </div>


          <button
            type="button"
            className="cart-close-button"
            onClick={onClose}
          >
            ×
          </button>

        </div>


        {items.length === 0 ? (

          <div className="cart-empty">

            <span>
              🛒
            </span>

            <h3>
              Your basket is empty
            </h3>

            <p>
              Add products from your
              predictions, assistant or
              reorder planner.
            </p>

          </div>

        ) : (

          <>

            <div className="cart-items">

              {items.map((item) => (

                <article
                  className="cart-item"
                  key={item.product_id}
                >

                  <div className="cart-item-copy">

                    <span className="cart-item-source">
                      {formatCartSource(
                        item.source
                      )}
                    </span>

                    <strong>
                      {item.product_name}
                    </strong>

                    <small>
                      {item.department}
                      {" · "}
                      {item.aisle}
                    </small>

                  </div>


                  <div className="cart-item-side">

                    {item.probability_pct > 0 && (
                      <span>
                        {item.probability_pct.toFixed(1)}
                        %
                      </span>
                    )}


                    <button
                      type="button"
                      onClick={() =>
                        onRemove(
                          item.product_id
                        )
                      }
                    >
                      Remove
                    </button>

                  </div>

                </article>

              ))}

            </div>


            <div className="cart-drawer-footer">

              <div>

                <strong>
                  {items.length}
                </strong>

                <span>
                  {" "}
                  products in your
                  smart basket
                </span>

              </div>


              <button
                type="button"
                className="cart-clear-button"
                onClick={onClear}
              >
                Clear basket
              </button>

            </div>

          </>

        )}

      </aside>

    </>
  );
}

/* ============================================================
   SHOPPING ASSISTANT VIEW
============================================================ */

function ShoppingAssistant({
  assistant,
  completedActions,
  onAction,
}) {
  return (
    <section className="assistant-view">

      {/* ========================================================
          ASSISTANT SUMMARY
      ======================================================== */}

      <section className="assistant-summary">

        <div className="summary-text">

          <p className="eyebrow">
            YOUR SHOPPING ASSISTANT
          </p>

          <h2>
            Customer {assistant.user_id}
          </h2>

          <p className="shopping-summary">
            {assistant.shopping_summary}
          </p>

        </div>


        <div className="recommendation-count">

          <strong>
            {assistant.total_recommendations}
          </strong>

          <span>
            recommendations
          </span>

        </div>

      </section>


      {/* ========================================================
          ASSISTANT STATS
      ======================================================== */}

      <section className="stats">

        <Stat
          value={
            assistant.section_counts
              ?.reorder_now ?? 0
          }
          label="Reorder now"
        />

        <Stat
          value={
            assistant.section_counts
              ?.coming_up ?? 0
          }
          label="Coming up"
        />

        <Stat
          value={
            assistant.section_counts
              ?.favorites_for_later ?? 0
          }
          label="Favorites for later"
        />

        <Stat
          value={
            assistant.section_counts
              ?.discover ?? 0
          }
          label="Discover"
        />

        <Stat
          value={
            assistant.section_counts
              ?.other_recommendations ?? 0
          }
          label="Other recommendations"
        />

      </section>


      {/* ========================================================
          RECOMMENDATION STORY
      ======================================================== */}

      <div className="assistant-story">

        <div className="story-intro">

          <p className="story-kicker">
            AI SHOPPING PLAN
          </p>

          <h2>
            What should you do next?
          </h2>

          <p>
            Recommendations are organized by urgency,
            purchase timing and shopping behavior.
          </p>

        </div>


        <RecommendationSection
          title="Reorder now"
          subtitle="Products that appear ready for your next order."
          icon="↗"
          type="urgent"
          items={
            assistant.sections
              ?.reorder_now || []
          }
          completedActions={completedActions}
          onAction={onAction}
        />


        <RecommendationSection
          title="Coming up"
          subtitle="Products approaching their usual reorder window."
          icon="◷"
          type="coming"
          items={
            assistant.sections
              ?.coming_up || []
          }
          completedActions={completedActions}
          onAction={onAction}
        />


        <RecommendationSection
          title="Favorites for later"
          subtitle="Frequent purchases that are likely relevant, but not yet due."
          icon="♡"
          type="favorite"
          items={
            assistant.sections
              ?.favorites_for_later || []
          }
          completedActions={completedActions}
          onAction={onAction}
        />


        <RecommendationSection
          title="Discover something new"
          subtitle="Products inferred from your shopping behavior and related purchases."
          icon="✦"
          type="discover"
          items={
            assistant.sections
              ?.discover || []
          }
          completedActions={completedActions}
          onAction={onAction}
        />


        <RecommendationSection
          title="Other recommendations"
          subtitle="Additional products identified from your historical shopping profile."
          icon="＋"
          type="other"
          items={
            assistant.sections
              ?.other_recommendations || []
          }
          completedActions={completedActions}
          onAction={onAction}
        />

      </div>

    </section>
  );
}



/* ============================================================
   RECOMMENDATION SECTION
============================================================ */

function RecommendationSection({
  title,
  subtitle,
  icon,
  type,
  items,
  completedActions,
  onAction,
}) {

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section
      className={`recommendation-section ${type}`}
    >

      <div className="recommendation-section-header">

        <div className="section-icon">
          {icon}
        </div>

        <div>

          <div className="section-title-row">

            <h3>
              {title}
            </h3>

            <span className="section-count">
              {items.length}
            </span>

          </div>

          <p>
            {subtitle}
          </p>

        </div>

      </div>


      <div className="recommendation-grid">

        {items.map((product) => (
          <RecommendationCard
            key={product.product_id}
            product={product}
            completed={
              completedActions[
                product.product_id
              ]
            }
            onAction={onAction}
          />
        ))}

      </div>

    </section>
  );
}



/* ============================================================
   RECOMMENDATION CARD
============================================================ */

function RecommendationCard({
  product,
  completed,
  onAction,
}) {

  const probability =
    Number(product.purchase_probability || 0);

  const percentage =
    Math.round(probability * 1000) / 10;


  return (
    <article className="recommendation-card">

      <div className="recommendation-top">

        <div className="recommendation-rank">
          #{product.rank}
        </div>

        <div className="recommendation-main">

          <p className="product-context">
            {product.department} · {product.aisle}
          </p>

          <h4>
            {product.product_name}
          </h4>

        </div>

        <div className="assistant-probability">

          <strong>
            {percentage}%
          </strong>

          <span>
            likelihood
          </span>

        </div>

      </div>


      <div className="assistant-signal">

        <div className="assistant-signal-track">

          <div
            className="assistant-signal-fill"
            style={{
              width: `${Math.min(
                percentage,
                100
              )}%`,
            }}
          />

        </div>

      </div>


      <div className="why-panel">

        <div className="why-icon">
          ✦
        </div>

        <div>

          <span className="why-label">
            WHY THIS?
          </span>

          <p>
            {product.why_recommended}
          </p>

        </div>

      </div>


      <div className="recommendation-footer">

        <div className="recommendation-status">

          <span className="status-dot" />

          {formatStatus(
            product.reorder_status
          )}

        </div>


        <button
          type="button"
          className={
            completed
              ? "action-button completed"
              : "action-button"
          }
          disabled={Boolean(completed)}
          onClick={() =>
            onAction(product)
          }
        >

          {completed
            ? completedLabel(
                product.action
              )
            : product.action}

        </button>

      </div>

    </article>
  );
}



/* ============================================================
   NEXT BASKET VIEW
============================================================ */

function NextBasket({
  nextBasket,
  selectedPredictions,
  onTogglePrediction,
  onAddSelected,
  cartItems,
  onAddPrediction,
}) {

  const predictions =
    nextBasket.predictions || [];

  const selectedProducts =
    predictions.filter(
      (prediction) =>
        selectedPredictions[
          prediction.product_id
        ]
    );

  const cartProductIds =
    new Set(
      cartItems.map(
        (item) => item.product_id
      )
    );


  return (
    <section className="next-basket-section">

      {/* ========================================================
          NEXT BASKET HEADER
      ======================================================== */}

      <section className="next-basket-header">

        <div>

          <p className="eyebrow">
            ML NEXT-BASKET PREDICTION
          </p>

          <h2>
            Customer {nextBasket.user_id}
          </h2>

          <p className="shopping-summary">
            Top products predicted to appear in the
            customer's next order.
          </p>

        </div>


        <div className="recommendation-count">

          <strong>
            {nextBasket.total_predictions}
          </strong>

          <span>
            predictions
          </span>

        </div>

      </section>


      {/* ========================================================
          SMART BASKET BUILDER
      ======================================================== */}

      <section className="smart-basket-builder">

        <div className="smart-basket-builder-heading">

          <div>

            <p className="story-kicker">
              SMART BASKET BUILDER
            </p>

            <h2>
              Build my predicted basket
            </h2>

            <p>
              Start with the products the model
              believes are most likely to appear
              in your next order.
            </p>

          </div>


          <div className="smart-basket-selected-count">

            <strong>
              {selectedProducts.length}
            </strong>

            <span>
              selected
            </span>

          </div>

        </div>


        <div className="smart-basket-options">

          {predictions
            .slice(0, 6)
            .map((prediction) => {

              const percentage =
                Number(
                  prediction
                    .predicted_probability_pct ??
                  (
                    prediction
                      .purchase_probability *
                    100
                  )
                );

              const checked =
                Boolean(
                  selectedPredictions[
                    prediction.product_id
                  ]
                );


              return (

                <label
                  className={
                    checked
                      ? "smart-basket-option selected"
                      : "smart-basket-option"
                  }
                  key={prediction.product_id}
                >

                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onTogglePrediction(
                        prediction.product_id
                      )
                    }
                  />


                  <div className="smart-basket-option-copy">

                    <strong>
                      {prediction.product_name}
                    </strong>

                    <span>
                      {prediction.department}
                      {" · "}
                      {prediction.aisle}
                    </span>

                  </div>


                  <span className="smart-basket-option-score">
                    {percentage.toFixed(1)}%
                  </span>

                </label>

              );
            })}

        </div>


        <div className="smart-basket-builder-footer">

          <div>

            <strong>
              {selectedProducts.length}
            </strong>

            <span>
              {" "}suggested products ready
            </span>

          </div>


          <button
            type="button"
            className="smart-basket-add-button"
            disabled={
              selectedProducts.length === 0
            }
            onClick={onAddSelected}
          >
            Add selected basket
          </button>

        </div>

      </section>


      {/* ========================================================
          PREDICTION LIST
      ======================================================== */}

      <div className="prediction-list">

        {predictions.map(
          (prediction) => (

            <PredictionCard
              key={prediction.product_id}
              prediction={prediction}

              inCart={
                cartProductIds.has(
                  prediction.product_id
                )
              }

              onAdd={() =>
                onAddPrediction(
                  prediction
                )
              }
            />

          )
        )}

      </div>

    </section>
  );
}


/* ============================================================
   PREDICTION CARD
============================================================ */

function PredictionCard({
  prediction,
  inCart,
  onAdd,
}) {

  const percentage =
    Number(
      prediction.predicted_probability_pct ??
        prediction.purchase_probability * 100
    );

  return (
    <article className="prediction-card">

      <div className="prediction-rank">
        #{prediction.rank}
      </div>


      <div className="prediction-content">

        <div className="prediction-top">

          <div>

            <h3>
              {prediction.product_name}
            </h3>

            <p className="prediction-category">
              {prediction.department}
              {" · "}
              {prediction.aisle}
            </p>

          </div>


          <div className="prediction-percentage">
            {percentage.toFixed(1)}%
          </div>

        </div>


        <div className="probability-track">

          <div
            className="probability-fill"
            style={{
              width: `${Math.min(
                percentage,
                100
              )}%`,
            }}
          />

        </div>


        <div className="prediction-meta">

          <span>
            Likelihood of purchase
          </span>

          <span>
            {prediction.prediction_type}
          </span>

        </div>


        <div className="prediction-actions">

          <button
            type="button"
            className={
              inCart
                ? "action-button completed"
                : "action-button"
            }
            disabled={inCart}
            onClick={onAdd}
          >

            {inCart
              ? "In cart ✓"
              : "Add to cart"}

          </button>

        </div>

      </div>

    </article>
  );
}
/* ============================================================
   REORDER PLANNER VIEW
============================================================ */

function ReorderPlanner({
  planner,
  completedActions,
  onAction,
}) {

  if (!planner) {
    return (
      <section className="reorder-planner-view">

        <section className="reorder-planner-empty">

          <p className="eyebrow">
            REORDER PLANNER
          </p>

          <h2>
            No established reorder plan yet
          </h2>

          <p>
            This customer does not currently have enough
            reorder-cycle information among the surfaced
            products.
          </p>

        </section>

      </section>
    );
  }


  const sections = [
    {
      key: "overdue",
      title: "Overdue",
      subtitle:
        "These products are already past their usual reorder window.",
      icon: "!",
      tone: "overdue",
    },
    {
      key: "due_now",
      title: "Due now",
      subtitle:
        "These products are around their usual reorder time.",
      icon: "↻",
      tone: "due-now",
    },
    {
      key: "due_soon",
      title: "Due soon",
      subtitle:
        "These products are approaching their usual reorder window.",
      icon: "◷",
      tone: "due-soon",
    },
    {
      key: "early",
      title: "Coming later",
      subtitle:
        "Frequent products that are still earlier than their usual cycle.",
      icon: "→",
      tone: "early",
    },
    {
      key: "no_established_cycle",
      title: "Still learning",
      subtitle:
        "Previously purchased products without a reliable reorder cycle yet.",
      icon: "◇",
      tone: "learning",
    },
  ];


  return (
    <section className="reorder-planner-view">

      {/* ========================================================
          PLANNER HERO
      ======================================================== */}

      <section className="reorder-planner-hero">

        <div>

          <p className="eyebrow">
            PURCHASE-CYCLE INTELLIGENCE
          </p>

          <p className="planner-label">
            REORDER PLANNER
          </p>

          <h2>
            Stay ahead of your repeat purchases
          </h2>

          <p className="shopping-summary">
            {planner.planner_summary}
          </p>

        </div>


        <div className="planner-attention-card">

          <strong>
            {planner.attention_count ?? 0}
          </strong>

          <span>
            need attention now
          </span>

        </div>

      </section>


      {/* ========================================================
          PLANNER STATS
      ======================================================== */}

      <section className="stats reorder-planner-stats">

        <Stat
          value={
            planner.status_counts?.overdue ?? 0
          }
          label="Overdue"
        />

        <Stat
          value={
            planner.status_counts?.due_now ?? 0
          }
          label="Due now"
        />

        <Stat
          value={
            planner.status_counts?.due_soon ?? 0
          }
          label="Due soon"
        />

        <Stat
          value={
            planner.status_counts?.early ?? 0
          }
          label="Coming later"
        />

        <Stat
          value={
            planner.status_counts
              ?.no_established_cycle ?? 0
          }
          label="Learning cycle"
        />

      </section>


      {/* ========================================================
          REORDER TIMELINE
      ======================================================== */}

      <div className="reorder-planner-story">

        <div className="story-intro">

          <p className="story-kicker">
            YOUR REORDER TIMELINE
          </p>

          <h2>
            What needs attention?
          </h2>

          <p>
            Products are organized by their normal purchase
            cycle rather than only by prediction probability.
          </p>

        </div>


        {sections.map((section) => (

          <ReorderPlannerSection

            key={section.key}

            title={section.title}

            subtitle={section.subtitle}

            icon={section.icon}

            tone={section.tone}

            items={
              planner.sections?.[section.key] || []
            }

            completedActions={completedActions}

            onAction={onAction}

          />

        ))}

      </div>

    </section>
  );
}



/* ============================================================
   REORDER PLANNER SECTION
============================================================ */

function ReorderPlannerSection({
  title,
  subtitle,
  icon,
  tone,
  items,
  completedActions,
  onAction,
}) {

  if (!items || items.length === 0) {
    return null;
  }


  return (
    <section
      className={`planner-section ${tone}`}
    >

      <div className="planner-section-header">

        <div className="planner-section-icon">
          {icon}
        </div>


        <div>

          <div className="section-title-row">

            <h3>
              {title}
            </h3>

            <span className="section-count">
              {items.length}
            </span>

          </div>


          <p>
            {subtitle}
          </p>

        </div>

      </div>


      <div className="planner-grid">

        {items.map((product) => (

          <ReorderPlannerCard

            key={product.product_id}

            product={product}

            completed={
              completedActions[
                product.product_id
              ]
            }

            onAction={onAction}

          />

        ))}

      </div>

    </section>
  );
}



/* ============================================================
   REORDER PLANNER CARD
============================================================ */

function ReorderPlannerCard({
  product,
  completed,
  onAction,
}) {

  const usualGap =
    product.usual_order_gap != null
      ? Number(product.usual_order_gap)
      : null;


  const ordersSince =
    product.orders_since_last_purchase != null
      ? Number(
          product.orders_since_last_purchase
        )
      : null;


  const reorderRate =
    product.historical_reorder_rate_pct != null
      ? Number(
          product.historical_reorder_rate_pct
        )
      : null;


  const probability =
    product.purchase_probability_pct != null
      ? Number(
          product.purchase_probability_pct
        )
      : 0;


  const hasCycle =
    usualGap !== null &&
    usualGap > 0 &&
    ordersSince !== null;


  const cycleProgress =
    hasCycle
      ? (ordersSince / usualGap) * 100
      : null;


  const visualCycleProgress =
    cycleProgress !== null
      ? Math.min(
          Math.max(cycleProgress, 0),
          100
        )
      : 0;


  return (
    <article className="planner-card">

      <div className="planner-card-top">

        <span
          className={`planner-status-badge ${String(
            product.reorder_status || ""
          )
            .toLowerCase()
            .replaceAll("_", "-")}`}
        >
          {formatStatus(
            product.reorder_status
          )}
        </span>


        <div className="planner-likelihood">

          <strong>
            {probability.toFixed(1)}%
          </strong>

          <span>
            next-basket likelihood
          </span>

        </div>

      </div>


      <p className="product-context">
        {product.department} · {product.aisle}
      </p>


      <h3 className="planner-product-name">
        {product.product_name}
      </h3>


      <div className="planner-cycle-metrics">

        <div className="planner-cycle-metric">

          <span>
            Usually every
          </span>

          <strong>
            {usualGap !== null && usualGap > 0
              ? `${usualGap.toFixed(1)} orders`
              : "Learning"}
          </strong>

        </div>


        <div className="planner-cycle-metric">

          <span>
            Last purchased
          </span>

          <strong>
            {ordersSince !== null
              ? `${ordersSince} ${
                  ordersSince === 1
                    ? "order"
                    : "orders"
                } ago`
              : "—"}
          </strong>

        </div>


        <div className="planner-cycle-metric">

          <span>
            Historical reorder rate
          </span>

          <strong>
            {reorderRate !== null
              ? `${reorderRate.toFixed(1)}%`
              : "—"}
          </strong>

        </div>

      </div>


      {hasCycle && (

        <div className="planner-cycle-progress">

          <div className="planner-cycle-progress-top">

            <span>
              Reorder cycle progress
            </span>

            <strong>
              {Math.round(cycleProgress)}%
            </strong>

          </div>


          <div className="planner-cycle-track">

            <div
              className="planner-cycle-fill"
              style={{
                width: `${visualCycleProgress}%`,
              }}
            />

          </div>

        </div>

      )}


      <div className="planner-why">

        <span className="why-label">
          WHY THIS TIMING?
        </span>

        <p>
          {product.why}
        </p>

      </div>


      <div className="planner-card-footer">

        <span className="planner-rank">
          Prediction #{product.rank}
        </span>


        <button
          type="button"
          className={
            completed
              ? "action-button completed"
              : "action-button"
          }
          disabled={Boolean(completed)}
          onClick={() =>
            onAction(product)
          }
        >

          {completed
            ? completedLabel(
                product.action
              )
            : product.action}

        </button>

      </div>

    </article>
  );
}
/* ============================================================
   SHOPPING DNA VIEW
============================================================ */

function ShoppingDNA({ shoppingDna }) {

  const profile =
    shoppingDna.profile || {};

  const fingerprint =
    shoppingDna.fingerprint || {};

  const rhythm =
    shoppingDna.shopping_rhythm || {};

  const history =
    shoppingDna.history || {};

  const categorySignature =
    shoppingDna.category_signature || {};

  const insights =
    shoppingDna.insights || {};


  const dnaDimensions = [
    {
      key: "L",
      label: "Loyalty",
      value: fingerprint.loyalty ?? 0,
      description:
        "Strength of repeat purchasing behavior",
    },
    {
      key: "E",
      label: "Exploration",
      value: fingerprint.exploration ?? 0,
      description:
        "Tendency to explore different products",
    },
    {
      key: "R",
      label: "Routine",
      value: fingerprint.routine ?? 0,
      description:
        "Consistency of shopping patterns",
    },
    {
      key: "B",
      label: "Basket intensity",
      value: fingerprint.basket_intensity ?? 0,
      description:
        "Relative size and intensity of baskets",
    },
    {
      key: "C",
      label: "Category focus",
      value: fingerprint.category_focus ?? 0,
      description:
        "Concentration within favorite categories",
    },
  ];


  return (
    <section className="shopping-dna-view">

      {/* ========================================================
          DNA HERO
      ======================================================== */}

      <section className="dna-hero">

        <div className="dna-hero-copy">

          <p className="eyebrow">
            CUSTOMER BEHAVIORAL INTELLIGENCE
          </p>

          <p className="dna-label">
            SHOPPING DNA
          </p>

          <h2>
            {profile.headline ||
              profile.persona ||
              `Customer ${shoppingDna.user_id}`}
          </h2>

          <p className="dna-summary">
            {shoppingDna.summary}
          </p>

          <div className="dna-meta-row">

            <span className="dna-persona-chip">
              {profile.persona}
            </span>

            <span className="dna-trait-chip">
              Dominant signal ·{" "}
              {formatDnaLabel(
                profile.dominant_trait
              )}
            </span>

          </div>

        </div>


        <div className="dna-identity">

          <span className="dna-identity-label">
            Behavioral code
          </span>

          <strong className="dna-code">
            {profile.dna_code}
          </strong>

          <div className="dna-dominant-score">

            <span>
              dominant trait strength
            </span>

            <strong>
              {formatScore(
                profile.dominant_score
              )}
            </strong>

          </div>

        </div>

      </section>

{/* ========================================================
    INTERACTIVE DNA MAP
======================================================== */}

<ShoppingDnaMap
  fingerprint={fingerprint}
  dominantTrait={profile.dominant_trait}
/>
      {

      /* ========================================================
          DNA FINGERPRINT
      ======================================================== */}

      <section className="dna-fingerprint-section">

        <div className="dna-section-heading">

          <div>

            <p className="story-kicker">
              BEHAVIORAL FINGERPRINT
            </p>

            <h2>
              Your five shopping signals
            </h2>

          </div>

          <p>
            Five behavioral dimensions summarize how this
            customer shops, repeats, explores and builds
            baskets.
          </p>

        </div>


        <div className="dna-fingerprint">

          {dnaDimensions.map((dimension) => (
            <DnaDimension
              key={dimension.key}
              dimension={dimension}
            />
          ))}

        </div>

      </section>


      {/* ========================================================
          BEHAVIORAL PROFILE
      ======================================================== */}

      <section className="dna-profile-grid">

        <div className="dna-panel dna-rhythm-panel">

          <div className="dna-panel-heading">

            <span className="dna-panel-icon">
              ◷
            </span>

            <div>
              <p className="dna-panel-kicker">
                SHOPPING RHYTHM
              </p>

              <h3>
                How this customer shops
              </h3>
            </div>

          </div>


          <div className="dna-metric-grid">

            <DnaMetric
              label="Frequency"
              value={rhythm.frequency}
            />

            <DnaMetric
              label="Regularity"
              value={rhythm.regularity}
            />

            <DnaMetric
              label="Basket momentum"
              value={rhythm.basket_momentum}
            />

            <DnaMetric
              label="Average basket"
              value={
                rhythm.avg_basket_size != null
                  ? `${rhythm.avg_basket_size} items`
                  : "—"
              }
            />

            <DnaMetric
              label="Average cycle"
              value={
                rhythm.avg_days_between_orders != null
                  ? `${rhythm.avg_days_between_orders} days`
                  : "—"
              }
            />

            <DnaMetric
              label="Preferred time"
              value={
                rhythm.preferred_time_period
                  ? formatDnaLabel(
                      rhythm.preferred_time_period
                    )
                  : "—"
              }
            />

          </div>

        </div>


        <div className="dna-panel dna-history-panel">

          <div className="dna-panel-heading">

            <span className="dna-panel-icon">
              ∞
            </span>

            <div>
              <p className="dna-panel-kicker">
                SHOPPING HISTORY
              </p>

              <h3>
                Behavioral foundation
              </h3>
            </div>

          </div>


          <div className="history-core">

            <div className="history-number">

              <strong>
                {history.prior_orders ?? "—"}
              </strong>

              <span>
                previous orders
              </span>

            </div>


            <div className="history-number">

              <strong>
                {history.unique_products ?? "—"}
              </strong>

              <span>
                unique products
              </span>

            </div>

          </div>


          <div className="loyalty-profile">

            <span>
              Loyalty profile
            </span>

            <strong>
              {formatDnaLabel(
                history.loyalty_profile
              )}
            </strong>

          </div>

        </div>

      </section>


      {/* ========================================================
          CATEGORY SIGNATURE
      ======================================================== */}

      <section className="dna-category-section">

        <div className="dna-section-heading">

          <div>

            <p className="story-kicker">
              CATEGORY SIGNATURE
            </p>

            <h2>
              Where this customer naturally gravitates
            </h2>

          </div>

          <p>
            Affinity shows the strongest historical
            department and aisle preferences.
          </p>

        </div>


        <div className="category-signature-grid">

          <CategoryAffinityPanel
            title="Favorite departments"
            items={
              categorySignature.departments || []
            }
          />

          <CategoryAffinityPanel
            title="Favorite aisles"
            items={
              categorySignature.aisles || []
            }
          />

        </div>

      </section>


      {/* ========================================================
          AI INTERPRETATION
      ======================================================== */}

      <section className="dna-insights-section">

        <div className="dna-section-heading">

          <div>

            <p className="story-kicker">
              AI INTERPRETATION
            </p>

            <h2>
              What this fingerprint means
            </h2>

          </div>

        </div>


        <div className="dna-insight-grid">

          <InsightCard
            icon="↻"
            label="Loyalty"
            text={insights.loyalty}
          />

          <InsightCard
            icon="◷"
            label="Frequency"
            text={insights.frequency}
          />

          <InsightCard
            icon="▦"
            label="Basket behavior"
            text={insights.basket}
          />

          <InsightCard
            icon="◎"
            label="Category signal"
            text={insights.category}
          />

          <InsightCard
            icon="☼"
            label="Shopping time"
            text={insights.time}
          />

          <InsightCard
            icon="✦"
            label="Dominant DNA trait"
            text={insights.dominant_trait}
            featured
          />

        </div>

      </section>

    </section>
  );
}


/* ============================================================
   SHOPPING DNA MAP
============================================================ */

function ShoppingDnaMap({
  fingerprint,
  dominantTrait,
}) {
  const dimensions = [
    {
      key: "loyalty",
      short: "L",
      label: "Loyalty",
      value: Number(fingerprint.loyalty ?? 0),
    },
    {
      key: "exploration",
      short: "E",
      label: "Exploration",
      value: Number(fingerprint.exploration ?? 0),
    },
    {
      key: "routine",
      short: "R",
      label: "Routine",
      value: Number(fingerprint.routine ?? 0),
    },
    {
      key: "basket_intensity",
      short: "B",
      label: "Basket Intensity",
      value: Number(
        fingerprint.basket_intensity ?? 0
      ),
    },
    {
      key: "category_focus",
      short: "C",
      label: "Category Focus",
      value: Number(
        fingerprint.category_focus ?? 0
      ),
    },
  ];

  const width = 520;
  const height = 460;

  const centerX = width / 2;
  const centerY = 218;

  const maxRadius = 150;

  const angleOffset = -Math.PI / 2;

  function pointFor(index, percentage) {
    const angle =
      angleOffset +
      (Math.PI * 2 * index) /
        dimensions.length;

    const radius =
      maxRadius *
      Math.max(
        0,
        Math.min(percentage, 100)
      ) /
      100;

    return {
      x:
        centerX +
        Math.cos(angle) * radius,

      y:
        centerY +
        Math.sin(angle) * radius,
    };
  }

  function polygonPoints(scale = 100) {
    return dimensions
      .map((_, index) => {
        const point = pointFor(
          index,
          scale
        );

        return `${point.x},${point.y}`;
      })
      .join(" ");
  }

  const customerPolygon =
    dimensions
      .map((dimension, index) => {
        const point = pointFor(
          index,
          dimension.value
        );

        return `${point.x},${point.y}`;
      })
      .join(" ");

  const dominantNormalized =
    String(dominantTrait || "")
      .toLowerCase()
      .replaceAll(" ", "_");

  return (
    <section className="dna-map-section">

      <div className="dna-map-heading">

        <div>
          <p className="story-kicker">
            BEHAVIORAL GEOMETRY
          </p>

          <h2>
            Your Shopping DNA shape
          </h2>

          <p>
            A visual fingerprint generated from
            five behavioral dimensions.
          </p>
        </div>

        <div className="dna-map-legend">

          <span className="dna-map-legend-dot" />

          Dynamic customer fingerprint

        </div>

      </div>


      <div className="dna-map-layout">

        <div className="dna-map-shell">

          <div className="dna-map-glow" />

          <svg
            className="dna-map-svg"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Shopping DNA behavioral fingerprint"
          >

            <defs>

              <linearGradient
                id="dnaPolygonGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor="#22e27d"
                />

                <stop
                  offset="50%"
                  stopColor="#0aa65b"
                />

                <stop
                  offset="100%"
                  stopColor="#087341"
                />

              </linearGradient>


              <radialGradient
                id="dnaGlow"
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop
                  offset="0%"
                  stopColor="#41ef92"
                  stopOpacity="0.34"
                />

                <stop
                  offset="100%"
                  stopColor="#41ef92"
                  stopOpacity="0"
                />
              </radialGradient>

            </defs>


            {/* Ambient glow */}

            <circle
              cx={centerX}
              cy={centerY}
              r="180"
              fill="url(#dnaGlow)"
            />


            {/* Grid polygons */}

            {[20, 40, 60, 80, 100].map(
              (scale) => (
                <polygon
                  key={scale}
                  points={polygonPoints(scale)}
                  className={
                    scale === 100
                      ? "dna-map-grid dna-map-grid-outer"
                      : "dna-map-grid"
                  }
                />
              )
            )}


            {/* Axis lines */}

            {dimensions.map(
              (_, index) => {
                const edge = pointFor(
                  index,
                  100
                );

                return (
                  <line
                    key={`axis-${index}`}
                    x1={centerX}
                    y1={centerY}
                    x2={edge.x}
                    y2={edge.y}
                    className="dna-map-axis"
                  />
                );
              }
            )}


            {/* Customer polygon */}

            <polygon
              points={customerPolygon}
              className="dna-map-customer-shape"
            />


            {/* Customer points */}

            {dimensions.map(
              (dimension, index) => {
                const point = pointFor(
                  index,
                  dimension.value
                );

                const isDominant =
                  dominantNormalized ===
                  dimension.key;

                return (
                  <g
                    key={
                      dimension.key
                    }
                  >

                    {isDominant && (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="15"
                        className="dna-map-dominant-halo"
                      />
                    )}

                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={
                        isDominant
                          ? 7
                          : 5
                      }
                      className={
                        isDominant
                          ? "dna-map-node dominant"
                          : "dna-map-node"
                      }
                    />

                  </g>
                );
              }
            )}


            {/* Center */}

            <circle
              cx={centerX}
              cy={centerY}
              r="5"
              className="dna-map-center"
            />


            {/* Labels */}

            {dimensions.map(
              (dimension, index) => {

                const angle =
                  angleOffset +
                  (Math.PI *
                    2 *
                    index) /
                    dimensions.length;

                const labelRadius =
                  maxRadius + 58;

                const x =
                  centerX +
                  Math.cos(angle) *
                    labelRadius;

                const y =
                  centerY +
                  Math.sin(angle) *
                    labelRadius;

                const isDominant =
                  dominantNormalized ===
                  dimension.key;

                return (
                  <g
                    key={`label-${dimension.key}`}
                  >

                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      className={
                        isDominant
                          ? "dna-map-label dominant"
                          : "dna-map-label"
                      }
                    >
                      {dimension.label}
                    </text>

                    <text
                      x={x}
                      y={y + 19}
                      textAnchor="middle"
                      className={
                        isDominant
                          ? "dna-map-score dominant"
                          : "dna-map-score"
                      }
                    >
                      {dimension.value.toFixed(
                        1
                      )}
                    </text>

                  </g>
                );
              }
            )}

          </svg>

        </div>


        {/* ====================================================
            SIDE INTELLIGENCE
        ==================================================== */}

        <div className="dna-map-analysis">

          <p className="dna-panel-kicker">
            LIVE PROFILE
          </p>

          <h3>
            Behavioral composition
          </h3>


          <div className="dna-map-analysis-list">

            {[...dimensions]
              .sort(
                (a, b) =>
                  b.value -
                  a.value
              )
              .map(
                (
                  dimension,
                  index
                ) => (
                  <div
                    className={
                      index === 0
                        ? "dna-map-analysis-item strongest"
                        : "dna-map-analysis-item"
                    }
                    key={
                      dimension.key
                    }
                  >

                    <div className="dna-map-analysis-top">

                      <div>

                        <span className="dna-map-rank">
                          0{index + 1}
                        </span>

                        <span>
                          {
                            dimension.label
                          }
                        </span>

                      </div>

                      <strong>
                        {dimension.value.toFixed(
                          1
                        )}
                      </strong>

                    </div>


                    <div className="dna-map-mini-track">

                      <div
                        className="dna-map-mini-fill"
                        style={{
                          width: `${Math.min(
                            dimension.value,
                            100
                          )}%`,
                        }}
                      />

                    </div>

                  </div>
                )
              )}

          </div>

        </div>

      </div>

    </section>
  );
}
/* ============================================================
   DNA DIMENSION
============================================================ */

function DnaDimension({ dimension }) {

  const score =
    Number(dimension.value || 0);

  const safeScore =
    Math.max(
      0,
      Math.min(score, 100)
    );

  return (
    <article className="dna-dimension-card">

      <div className="dna-dimension-top">

        <span className="dna-dimension-letter">
          {dimension.key}
        </span>

        <span className="dna-dimension-value">
          {safeScore.toFixed(1)}
        </span>

      </div>


      <h3>
        {dimension.label}
      </h3>

      <p>
        {dimension.description}
      </p>


      <div className="dna-score-track">

        <div
          className="dna-score-fill"
          style={{
            width: `${safeScore}%`,
          }}
        />

      </div>


      <div className="dna-scale">

        <span>0</span>
        <span>100</span>

      </div>

    </article>
  );
}



/* ============================================================
   DNA METRIC
============================================================ */

function DnaMetric({ label, value }) {
  return (
    <div className="dna-metric">

      <span>
        {label}
      </span>

      <strong>
        {value ?? "—"}
      </strong>

    </div>
  );
}



/* ============================================================
   CATEGORY AFFINITY
============================================================ */

function CategoryAffinityPanel({
  title,
  items,
}) {

  const validItems =
    (items || []).filter(
      (item) => item?.name
    );

  return (
    <div className="affinity-panel">

      <div className="affinity-panel-header">

        <p className="dna-panel-kicker">
          {title}
        </p>

      </div>


      <div className="affinity-list">

        {validItems.map((item) => {

          const affinity =
            Number(item.affinity_pct || 0);

          return (
            <div
              className="affinity-item"
              key={`${title}-${item.rank}-${item.name}`}
            >

              <div className="affinity-top">

                <div>

                  <span className="affinity-rank">
                    #{item.rank}
                  </span>

                  <strong>
                    {formatDnaLabel(
                      item.name
                    )}
                  </strong>

                </div>


                <span className="affinity-value">
                  {affinity.toFixed(1)}%
                </span>

              </div>


              <div className="affinity-track">

                <div
                  className="affinity-fill"
                  style={{
                    width: `${Math.min(
                      affinity,
                      100
                    )}%`,
                  }}
                />

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}



/* ============================================================
   DNA INSIGHT
============================================================ */

function InsightCard({
  icon,
  label,
  text,
  featured = false,
}) {

  if (!text) {
    return null;
  }

  return (
    <article
      className={
        featured
          ? "dna-insight-card featured"
          : "dna-insight-card"
      }
    >

      <div className="dna-insight-icon">
        {icon}
      </div>


      <div>

        <p className="dna-insight-label">
          {label}
        </p>

        <p className="dna-insight-text">
          {text}
        </p>

      </div>

    </article>
  );
}



/* ============================================================
   STAT CARD
============================================================ */

function Stat({ value, label }) {
  return (
    <div className="stat-card">

      <strong>
        {value}
      </strong>

      <span>
        {label}
      </span>

    </div>
  );
}



/* ============================================================
   HELPERS
============================================================ */

function formatStatus(status) {

  if (!status) {
    return "Recommendation";
  }

  return status
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}


function completedLabel(action) {

  const labels = {
    "Add again": "Added ✓",
    "Save for later": "Saved ✓",
    "Remind me later": "Reminder set ✓",
    "Try it": "Interested ✓",
    "View product": "Viewed ✓",
  };

  return labels[action] || "Done ✓";
}


function formatDnaLabel(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}


function formatScore(value) {

  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return `${Number(value).toFixed(1)}%`;
}

function formatCartSource(source) {

  const labels = {
    "shopping-assistant":
      "Shopping Assistant",

    "next-basket":
      "Next Basket",

    "reorder-planner":
      "Reorder Planner",
  };

  return (
    labels[source] ||
    "Smart Shopping"
  );
}

export default App;