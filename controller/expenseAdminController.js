const AccountantExpense = require("../model/accountantExpense");
const MajorExpense = require("../model/MajorExpense");
const SupervisorExpense = require("../model/supervisorExpense");

exports.getExpenseAdminDashboard = async (req, res) => {
  try {
    const { site = "all" } = req.query;

    const [acc, maj, sup] = await Promise.all([
      AccountantExpense.find({ status: { $in: ["paid", "processed"] } }).lean(),
      MajorExpense.find({ status: "paid" }).lean(),
      SupervisorExpense.find({ status: "approved" }).lean(),
    ]);

    const totalAcc = acc.reduce((s, e) => s + e.amount, 0);
    const totalMaj = maj.reduce((s, e) => s + e.amount, 0);
    const totalSup = sup.reduce((s, e) => s + e.amount, 0);
    const totalExp = totalAcc + totalMaj + totalSup;

    const siteMap = new Map();
    maj.forEach(e => {
      const id = e.site || "unknown";
      if (!siteMap.has(id)) siteMap.set(id, { id, name: e.site || "Unknown", expenses: 0 });
      siteMap.get(id).expenses += e.amount;
    });

    if (totalAcc + totalSup > 0) {
      siteMap.set("general", { id: "general", name: "General", expenses: totalAcc + totalSup });
    }

    const sites = Array.from(siteMap.values()).map(s => {
      const revenue = Math.round(s.expenses * 1.7);
      return { ...s, revenue, profit: revenue - s.expenses };
    });

    const filtered = site === "all" ? sites : sites.filter(s => s.id === site);

    const catMap = new Map();
    [...acc, ...maj, ...sup].forEach(e => {
      const key = e.type || e.category || "Other";
      catMap.set(key, (catMap.get(key) || 0) + e.amount);
    });

    const breakdown = Array.from(catMap)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalExp > 0 ? Math.round((amt / totalExp) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    res.json({
      success: true,
      data: {
        sites: filtered,
        expenseBreakdown: breakdown,
        summary: {
          totalRevenue: filtered.reduce((s, site) => s + site.revenue, 0),
          totalExpenses: totalExp,
          totalProfit: filtered.reduce((s, site) => s + site.profit, 0),
          activeSites: filtered.length,
        },
      },
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};