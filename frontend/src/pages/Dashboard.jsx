import { useNavigate } from "react-router-dom";
import { dashboardStyles } from "../assets/dummyStyles.js";
import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import KpiCard from "../components/KpiCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  INVOICE_LIST_CACHE_EVENT,
  readInvoiceListCache,
  writeInvoiceListCache,
} from "../utils/invoiceListCache.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function currencyFmt(amount = 0, currency = "INR") {
  try {
    const n = Number(amount || 0);
    if (currency === "INR")
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(n);
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return `${currency} ${amount}`;
  }
} // currency in indian

const FileTextIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const EyeIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const DeleteIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

/* small helpers */
function capitalize(s) {
  if (!s) return s;
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

/* ---------- date formatting helper: DD/MM/YYYY ---------- */
function formatDate(dateInput) {
  if (!dateInput) return "—";
  const d = dateInput instanceof Date ? dateInput : new Date(String(dateInput));
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const USD_TO_INR = 90;

function convertToINR(amount = 0, currency = "INR") {
  const n = Number(amount || 0);
  const curr = String(currency || "INR")
    .trim()
    .toUpperCase();

  if (curr === "INR") return n;
  if (curr === "USD") return n * USD_TO_INR;
  return n;
}

function normalizeDashboardInvoice(inv = {}) {
  const clientObj = inv.client ?? {};
  const amountVal = Number(inv.total ?? inv.amount ?? 0);
  const currency = (inv.currency || "INR").toUpperCase();

  return {
    ...inv,
    id: inv.invoiceNumber || inv._id || inv.id || String(inv._id || ""),
    client: clientObj,
    amount: amountVal,
    currency,
    status:
      typeof inv.status === "string"
        ? capitalize(inv.status)
        : inv.status || "Draft",
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { getToken, isSignedIn, userId } = useAuth();

  // to obtain the token
  const obtainToken = useCallback(async () => {
    if (typeof getToken !== "function") return null;
    try {
      let token = await getToken({ template: "default" }).catch(() => null);
      if (!token) {
        token = await getToken({ forceRefresh: true }).catch(() => null);
      }
      return token;
    } catch {
      return null;
    }
  }, [getToken]);

  const initialInvoiceCache = readInvoiceListCache(userId);
  const [storedInvoices, setStoredInvoices] = useState(() =>
    initialInvoiceCache
      ? initialInvoiceCache.invoices.map(normalizeDashboardInvoice)
      : []
  );
  const [loading, setLoading] = useState(() => !initialInvoiceCache);
  const [error, setError] = useState(null);

  //fetch invoices from backend
  const fetchInvoices = useCallback(async (options = {}) => {
    const force = options?.force === true;
    if (!force) {
      const cached = readInvoiceListCache(userId);
      if (cached) {
        setStoredInvoices(cached.invoices.map(normalizeDashboardInvoice));
        setError(null);
        setLoading(false);
        if (cached.isFresh) return;
      }
    }

    setLoading((current) => current || !storedInvoices.length);
    setError(null);

    try {
      const token = await obtainToken();
      const headers = { Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/invoice`, {
        method: "GET",
        headers,
      });
      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        // unauthorized - prompt login
        setError("Unauthorized. Please sign in.");
        setStoredInvoices([]);
        return;
      }

      if (!res.ok) {
        const msg = json?.message || `Failed to fetch (${res.status})`;
        throw new Error(msg);
      }

      const raw = Array.isArray(json?.data) ? json.data : [];
      writeInvoiceListCache(userId, raw);
      const mapped = raw.map(normalizeDashboardInvoice);
      setStoredInvoices(mapped);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      setError(err?.message || "Failed to load invoices");
      setStoredInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [obtainToken, storedInvoices.length, userId]);

  useEffect(() => {
    async function initializeData() {
      await fetchInvoices();
    }

    initializeData();

    function onStorage(e) {
      if (e.key?.startsWith("invoice_list_cache_v1:")) {
        void fetchInvoices();
      }
    }

    function onInvoiceCacheChanged() {
      void fetchInvoices();
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener(INVOICE_LIST_CACHE_EVENT, onInvoiceCacheChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(INVOICE_LIST_CACHE_EVENT, onInvoiceCacheChanged);
    };
  }, [fetchInvoices, isSignedIn]);

  const kpis = useMemo(() => {
    const totalInvoices = storedInvoices.length;
    let totalPaid = 0; // in INR
    let totalUnpaid = 0; // in INR
    let paidCount = 0;
    let unpaidCount = 0;

    storedInvoices.forEach((inv) => {
      const rawAmount =
        typeof inv.amount === "number"
          ? inv.amount
          : Number(inv.total ?? inv.amount ?? 0);
      const invCurrency = inv.currency || "INR";
      const amtInINR = convertToINR(rawAmount, invCurrency);

      if (inv.status === "Paid") {
        totalPaid += amtInINR;
        paidCount++;
      }
      if (inv.status === "Unpaid" || inv.status === "Overdue") {
        totalUnpaid += amtInINR;
        unpaidCount++;
      }
    });

    const totalAmount = totalPaid + totalUnpaid;
    const paidPercentage =
      totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;
    const unpaidPercentage =
      totalAmount > 0 ? (totalUnpaid / totalAmount) * 100 : 0;

    return {
      totalInvoices,
      totalPaid,
      totalUnpaid,
      paidCount,
      unpaidCount,
      paidPercentage,
      unpaidPercentage,
    };
  }, [storedInvoices]);

  const recent = useMemo(() => {
    return storedInvoices
      .slice()
      .sort(
        (a, b) =>
          (Date.parse(b.issueDate || 0) || 0) -
          (Date.parse(a.issueDate || 0) || 0),
      )
      .slice(0, 5);
  }, [storedInvoices]);

  const getClientName = (inv) => {
    if (!inv) return "";
    if (typeof inv.client === "string") return inv.client;
    if (typeof inv.client === "object")
      return inv.client?.name || inv.client?.company || inv.company || "";
    return inv.company || "Client";
  };

  const getClientInitial = (inv) => {
    const clientName = getClientName(inv);
    return clientName ? clientName.charAt(0).toUpperCase() : "C";
  };

  function openInvoice(invRow) {
    const payload = invRow;
    navigate(`/app/invoices/${invRow.id}`, { state: { invoice: payload } });
  }

  async function handleDeleteInvoice(inv) {
    if (!inv?.id) return;
    if (!confirm(`Delete invoice ${inv.id}? This cannot be undone.`)) return;

    try {
      const token = await obtainToken();
      if (!token) {
        alert("Delete requires authentication. Please sign in.");
        navigate("/login");
        return;
      }

      const res = await fetch(
        `${API_BASE}/api/invoice/${encodeURIComponent(inv.id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.status === 401) {
        alert("Unauthorized. Please sign in.");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || `Delete failed (${res.status})`);
      }

      await fetchInvoices({ force: true });
      alert("Invoice deleted.");
    } catch (err) {
      console.error("deleteInvoice error:", err);
      alert(err?.message || "Failed to delete invoice.");
    }
  }

  return (
    <div className={dashboardStyles.pageContainer}>
      <div className={dashboardStyles.headerContainer}>
        <h1 className={dashboardStyles.headerTitle}>Dashboard Overview</h1>
        <p className={dashboardStyles.headerSubtitle}>
          Track your invoicing performance and business insights
        </p>
      </div>
      {/* Loading error state */}
      {loading ? (
        <div className=" p-6">Loading invoices...</div>
      ) : error ? (
        <div className=" p-6">
          <div className="text-red-600 mb-3">Error: {error}</div>
          <div className=" flex gap-2 ">
            <button
              onClick={() => fetchInvoices({ force: true })}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              Retry
            </button>
            {String(error).toLowerCase().includes("unauthorized") && (
              <button
                onClick={() => navigate("/login")}
                className=" px-3 py-1 bg-gray-700 text-white rounded"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      ) : null}
      <div className={dashboardStyles.kpiGrid}>
        <KpiCard
          title="Total Invoices"
          value={kpis.totalInvoices}
          hint="Active invoices"
          iconType="document"
          trend={8.5}
        />
        <KpiCard
          title="Total Paid"
          value={currencyFmt(kpis.totalPaid, "INR")}
          hint="Received Amount (INR)"
          iconType="revenue"
          trend={12.2}
        />
        <KpiCard
          title="Total Unpaid"
          value={currencyFmt(kpis.totalUnpaid, "INR")}
          hint="Outstanding balance (INR)"
          iconType="clock"
          trend={-3.1}
        />
      </div>
      <div className={dashboardStyles.mainGrid}>
        <div className={dashboardStyles.sidebarColumn}>
          <div className={dashboardStyles.quickStatsCard}>
            <h3 className={dashboardStyles.quickStatsTitle}>Quick Stats</h3>
            <div className=" space-y-3">
              <div className={dashboardStyles.quickStatsRow}>
                <span className={dashboardStyles.quickStatsLabel}>
                  Paid Rate
                </span>
                <span className={dashboardStyles.quickStatsValue}>
                  {kpis.totalInvoices > 0
                    ? ((kpis.paidCount / kpis.totalInvoices) * 100).toFixed(1)
                    : 0}{" "}
                  %
                </span>
              </div>
              <div className={dashboardStyles.quickStatsRow}>
                <span className={dashboardStyles.quickStatsLabel}>
                  Avg. Invoice
                </span>
                <span className={dashboardStyles.quickStatsValue}>
                  {currencyFmt(
                    kpis.totalInvoices > 0
                      ? (kpis.totalPaid + kpis.totalUnpaid) / kpis.totalInvoices
                      : 0,
                    "INR",
                  )}
                </span>
              </div>
              <div className={dashboardStyles.quickStatsRow}>
                <span className={dashboardStyles.quickStatsLabel}>
                  Collection Eff.
                </span>
                <span className={dashboardStyles.quickStatsValue}>
                  {kpis.paidPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          {/* quick actions */}
          <div className={dashboardStyles.cardContainer}>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className={dashboardStyles.quickActionsContainer}>
                <button
                  onClick={() => navigate("/app/create-invoice")}
                  className={`${dashboardStyles.quickActionButton} ${dashboardStyles.quickActionBlue}`}
                >
                  <div
                    className={`${dashboardStyles.quickActionIconContainer} ${dashboardStyles.quickActionIconBlue}`}
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 5v14m-7-7h14" />
                    </svg>
                  </div>
                  <span className={dashboardStyles.quickActionText}>
                    Create Invoice
                  </span>
                </button>

                <button
                  onClick={() => navigate("/app/invoices")}
                  className={`${dashboardStyles.quickActionButton} ${dashboardStyles.quickActionGray}`}
                >
                  <div
                    className={`${dashboardStyles.quickActionIconContainer} ${dashboardStyles.quickActionIconGray}`}
                  >
                    <FileTextIcon className="w-4 h-4" />
                  </div>
                  <span className={dashboardStyles.quickActionText}>
                    View All Invoices
                  </span>
                </button>

                <button
                  onClick={() => navigate("/app/business")}
                  className={`${dashboardStyles.quickActionButton} ${dashboardStyles.quickActionGray}`}
                >
                  <div
                    className={`${dashboardStyles.quickActionIconContainer} ${dashboardStyles.quickActionIconGray}`}
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <span className={dashboardStyles.quickActionText}>
                    Business Profile
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className={dashboardStyles.contentColumn}>
          <div className={dashboardStyles.cardContainerOverflow}>
            <div className={dashboardStyles.tableHeader}>
              <div className={dashboardStyles.tableHeaderContent}>
                <div>
                  <h3 className={dashboardStyles.tableTitle}>
                    Recent Invoices
                  </h3>
                  <p className={dashboardStyles.tableSubtitle}>
                    Latest 5 Invoices from your account
                  </p>
                </div>
                <button
                  onClick={() => navigate("/app/invoices")}
                  className={dashboardStyles.tableActionButton}
                >
                  View All
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14m-7-7l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className={dashboardStyles.tableContainer}>
              <table className={dashboardStyles.table}>
                <thead>
                  <tr className={dashboardStyles.tableHead}>
                    <th className={dashboardStyles.tableHeaderCell}>
                      Client & ID
                    </th>
                    <th className={dashboardStyles.tableHeaderCell}>Amount</th>
                    <th className={dashboardStyles.tableHeaderCell}>Status</th>
                    <th className={dashboardStyles.tableHeaderCell}>
                      Due Date
                    </th>
                    <th className={dashboardStyles.tableHeaderCell}>Actions</th>
                  </tr>
                </thead>
                <tbody className={dashboardStyles.tableBody}>
                  {recent.map((inv) => {
                    const clientName = getClientName(inv);
                    const clientInitial = getClientInitial(inv);

                    return (
                      <tr
                        key={inv.id}
                        className={dashboardStyles.tableRow}
                        onClick={() => openInvoice(inv)}
                      >
                        <td className={dashboardStyles.tableCell}>
                          <div className=" flex items-center gap-3">
                            <div className={dashboardStyles.clientAvatar}>
                              {clientInitial}
                            </div>
                            <div>
                              <div className={dashboardStyles.clientInfo}>
                                {clientName}
                              </div>
                              <div className={dashboardStyles.clientSubInfo}>
                                {inv.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={dashboardStyles.tableCell}>
                          <div className={dashboardStyles.amountCell}>
                            {currencyFmt(inv.amount, inv.currency)}
                          </div>
                        </td>
                        <td className={dashboardStyles.tableCell}>
                          <StatusBadge
                            status={inv.status}
                            size="default"
                            showIcon={true}
                          />
                        </td>
                        <td className={dashboardStyles.tableCell}>
                          <div className={dashboardStyles.dateCell}>
                            {inv.dueDate ? formatDate(inv.dueDate) : "-"}
                          </div>
                        </td>
                        <td className={dashboardStyles.tableCell}>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openInvoice(inv);
                              }}
                              className={dashboardStyles.actionButton}
                            >
                              <EyeIcon className=" w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                              View
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteInvoice(inv);
                              }}
                              className={dashboardStyles.deleteActionButton}
                              title="Delete invoice"
                            >
                              <DeleteIcon className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* If No Invoices are present */}
                  {recent.length === 0 && !loading && (
                    <tr>
                      <td colSpan="5" className={dashboardStyles.emptyState}>
                        <div className={dashboardStyles.emptyStateText}>
                          <FileTextIcon
                            className={dashboardStyles.emptyStateIcon}
                          />
                          <div className={dashboardStyles.emptyStateMessage}>
                            No Invoices yet
                          </div>
                          <button
                            onClick={() => navigate("/app/create-invoice")}
                            className={dashboardStyles.emptyStateAction}
                          >
                            Create Your First Invoice 
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
