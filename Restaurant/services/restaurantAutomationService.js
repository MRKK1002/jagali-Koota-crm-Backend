const Customer = require("../RestautantModel/RestaurantCustomerModel");
const { sendSMS } = require("../../services/smsService");
const { sendEmail } = require("../../services/emailService");

/**
 * Automatically deduct stock when order payment is completed
 * Uses RecipeMaster + DepartmentStock system (Option B - department-wise deduction)
 */
async function deductStockOnOrderCompletion(order) {
  try {
    console.log(`[Stock Deduction] Processing order: ${order.orderNumber || order.orderId || order._id}`);
    
    if (!order.items || order.items.length === 0) {
      console.log("[Stock Deduction] No items in order, skipping");
      return { success: true, message: "No items to process" };
    }

    const RecipeMaster = require("../RestautantModel/RestaurantRecipeMasterModel");
    const DepartmentStock = require("../RestautantModel/DepartmentStockModel");
    const ConsumptionLog = require("../RestautantModel/ConsumptionLogModel");

    const deductions = [];
    const shortages = [];
    const branch = order.branchName || "MYSURU"; // Default branch

    // Process each item in the order
    for (const orderItem of order.items) {
      try {
        const menuItemId = orderItem.menuItemId || orderItem.menuItem;
        if (!menuItemId) {
          console.log(`[Stock Deduction] Skipping item ${orderItem.name} - no menuItemId`);
          continue;
        }

        // Find recipe in RecipeMaster (new system)
        const recipe = await RecipeMaster.findOne({ menuItemId: String(menuItemId) });
        if (!recipe) {
          console.log(`[Stock Deduction] No recipe found for menu item: ${orderItem.name} (${menuItemId})`);
          continue;
        }

        const department = recipe.department || "Kitchen";
        console.log(`[Stock Deduction] Found recipe for ${orderItem.name} → Department: ${department}`);

        // Process each ingredient in the recipe
        for (const ingredient of recipe.ingredients) {
          const neededQty = ingredient.quantity * (orderItem.quantity || 1);

          // Find department stock entry
          const stock = await DepartmentStock.findOne({
            department: department,
            branch: branch,
            rawMaterial: ingredient.rawMaterial,
          });

          if (!stock || stock.quantity < neededQty) {
            shortages.push({
              productName: ingredient.productName,
              needed: neededQty,
              available: stock ? stock.quantity : 0,
              unit: ingredient.unit,
              menuItem: orderItem.name,
              department: department,
            });
            console.warn(`[Stock Deduction] ⚠️ Insufficient: ${ingredient.productName} needs ${neededQty}${ingredient.unit}, available: ${stock ? stock.quantity : 0}`);
            continue;
          }

          // Deduct from department stock
          stock.quantity -= neededQty;
          await stock.save();

          deductions.push({
            productName: ingredient.productName,
            deducted: neededQty,
            remaining: stock.quantity,
            unit: ingredient.unit,
            menuItem: orderItem.name,
            department: department,
          });

          console.log(`[Stock Deduction] ✅ Deducted ${neededQty}${ingredient.unit} of ${ingredient.productName} from ${department}`);
        }
      } catch (itemError) {
        console.error(`[Stock Deduction] Error processing item ${orderItem.name}:`, itemError);
      }
    }

    // Log consumption
    if (deductions.length > 0) {
      try {
        await ConsumptionLog.create({
          department: deductions[0]?.department || "Kitchen",
          branch: branch,
          orderId: String(order._id),
          orderNumber: order.orderNumber || order.orderId || String(order._id),
          items: deductions.map(d => ({
            productName: d.productName,
            quantity: d.deducted,
            unit: d.unit,
            menuItem: d.menuItem,
          })),
          deductedAt: new Date(),
        });
        console.log(`[Stock Deduction] ✅ Consumption logged: ${deductions.length} items`);
      } catch (logErr) {
        console.error("[Stock Deduction] Error logging consumption:", logErr);
      }
    }

    const result = {
      success: true,
      message: `Stock deduction completed. ${deductions.length} materials deducted.${shortages.length > 0 ? ` ${shortages.length} shortages.` : ""}`,
      deductions,
      shortages: shortages.length > 0 ? shortages : undefined,
    };

    console.log(`[Stock Deduction] Result:`, result.message);
    return result;
  } catch (error) {
    console.error("[Stock Deduction] Fatal error:", error);
    return {
      success: false,
      message: "Failed to deduct stock",
      error: error.message,
    };
  }
}

/**
 * Get store location for a branch (defaults to first location)
 */
async function getStoreLocationForBranch(branchId) {
  try {
    const StoreLocation = require("../../model/StoreLocation");
    // Try to find location associated with branch
    let location = await StoreLocation.findOne({ branchId: branchId });
    
    // If not found, get the first available location
    if (!location) {
      location = await StoreLocation.findOne();
    }
    
    return location;
  } catch (error) {
    console.error("[Store Location] Error:", error);
    return null;
  }
}

/**
 * Check for low stock and auto-generate purchase suggestions
 */
async function checkLowStockAndSuggestPurchase() {
  try {
    console.log("[Low Stock Check] Starting low stock check...");
    
    const RawMaterial = require("../RestautantModel/RestaurantRawMaterialModel");
    const LocationInventory = require("../../model/inventoryModel");
    const PurchaseRequest = require("../../construction/models/PurchaseRequest");

    const lowStockItems = [];
    const purchaseSuggestions = [];

    // Get all raw materials
    const rawMaterials = await RawMaterial.find({ status: { $ne: "Out of Stock" } });
    
    for (const material of rawMaterials) {
      // Get inventory across all locations
      const inventories = await LocationInventory.find({ rawMaterialId: material._id });
      
      let totalStock = 0;
      for (const inv of inventories) {
        totalStock += inv.quantity || 0;
      }

      // Check if stock is below minimum level
      if (totalStock <= (material.minLevel || 0)) {
        lowStockItems.push({
          material: material._id,
          materialName: material.name,
          currentStock: totalStock,
          minLevel: material.minLevel,
          unit: material.unit,
        });

        // Check if purchase suggestion already exists
        const existingSuggestion = await PurchaseRequest.findOne({
          "items.rawMaterialId": material._id,
          status: { $in: ["Pending", "Draft"] },
        });

        if (!existingSuggestion) {
          // Auto-generate purchase suggestion
          const purchaseSuggestion = new PurchaseRequest({
            requestedBy: "System",
            items: [
              {
                rawMaterialId: material._id,
                materialName: material.name,
                quantity: (material.minLevel || 10) * 2, // Suggest 2x minimum level
                unit: material.unit,
                reason: "Auto-generated: Low stock alert",
              },
            ],
            priority: "High",
            status: "Draft",
            notes: `Auto-generated purchase suggestion. Current stock: ${totalStock}, Minimum: ${material.minLevel}`,
          });

          await purchaseSuggestion.save();
          purchaseSuggestions.push(purchaseSuggestion._id);
          console.log(`[Low Stock] Generated purchase suggestion for ${material.name}`);
        }
      }
    }

    return {
      success: true,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      purchaseSuggestionsGenerated: purchaseSuggestions.length,
      purchaseSuggestions,
    };
  } catch (error) {
    console.error("[Low Stock Check] Error:", error);
    return {
      success: false,
      message: "Failed to check low stock",
      error: error.message,
    };
  }
}

/**
 * Update CRM: Loyalty points, visit count, and tier upgrade
 */
async function updateCustomerCRM(order) {
  try {
    const phone = order.phone || order.customerMobile || order.customerPhone;
    if (!phone) {
      console.log("[CRM Update] No phone number found in order, skipping CRM update");
      return { success: false, message: "No customer phone number" };
    }

    // Find or create customer
    let customer = await Customer.findOne({ mobileNumber: phone, businessType: "restaurant" });
    
    if (!customer) {
      // Create new customer
      customer = new Customer({
        name: order.name || order.customerName || "Guest Customer",
        mobileNumber: phone,
        email: order.email || "",
        businessType: "restaurant",
        totalVisits: 0,
        totalSpent: 0,
        loyaltyPoints: 0,
      });
    }

    // Update visit count
    customer.totalVisits = (customer.totalVisits || 0) + 1;
    
    // Update total spent
    const orderTotal = order.total || order.grandTotal || order.totalAmount || 0;
    customer.totalSpent = (customer.totalSpent || 0) + orderTotal;
    
    // Calculate loyalty points (1 point per ₹10 spent, or use existing points from order)
    const pointsEarned = order.loyaltyPoints || Math.floor(orderTotal / 10);
    customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointsEarned;
    
    // Update last visit
    customer.lastVisit = new Date().toISOString();

    // Check for tier upgrade (visits >= 5)
    const previousTier = customer.loyaltyTier || "Bronze";
    let newTier = previousTier;
    
    if (customer.totalVisits >= 5 && customer.totalVisits < 10) {
      newTier = "Silver";
    } else if (customer.totalVisits >= 10 && customer.totalVisits < 20) {
      newTier = "Gold";
    } else if (customer.totalVisits >= 20) {
      newTier = "Platinum";
    }

    if (newTier !== previousTier) {
      customer.loyaltyTier = newTier;
      console.log(`[CRM Update] Customer ${phone} upgraded to ${newTier} tier`);
      
      // Send tier upgrade notification
      try {
        await sendSMS(
          phone,
          `Congratulations! You've been upgraded to ${newTier} tier. Enjoy exclusive discounts and offers!`
        );
      } catch (smsError) {
        console.error("[CRM Update] Failed to send tier upgrade SMS:", smsError);
      }
    }

    await customer.save();

    return {
      success: true,
      customer: customer._id,
      pointsEarned,
      tierUpgrade: newTier !== previousTier ? newTier : null,
      totalVisits: customer.totalVisits,
    };
  } catch (error) {
    console.error("[CRM Update] Error:", error);
    return {
      success: false,
      message: "Failed to update CRM",
      error: error.message,
    };
  }
}

/**
 * Send birthday/anniversary SMS/email offers
 */
async function sendBirthdayAnniversaryOffers() {
  try {
    const today = new Date();
    const todayStr = `${today.getMonth() + 1}-${today.getDate()}`;

    // Find customers with birthday or anniversary today
    const customers = await Customer.find({
      businessType: "restaurant",
      $or: [
        { dob: { $regex: todayStr } },
        { anniversary: { $regex: todayStr } },
      ],
    });

    const sentOffers = [];

    for (const customer of customers) {
      try {
        const isBirthday = customer.dob && customer.dob.includes(todayStr);
        const isAnniversary = customer.anniversary && customer.anniversary.includes(todayStr);

        let message = "";
        if (isBirthday) {
          message = `Happy Birthday ${customer.name}! 🎉 Enjoy 20% off on your next visit. Use code BDAY20. Valid for 7 days.`;
        } else if (isAnniversary) {
          message = `Happy Anniversary ${customer.name}! 💝 Celebrate with 15% off. Use code ANNIV15. Valid for 7 days.`;
        }

        if (message && customer.mobileNumber) {
          await sendSMS(customer.mobileNumber, message);
          sentOffers.push({
            customer: customer._id,
            type: isBirthday ? "birthday" : "anniversary",
            phone: customer.mobileNumber,
          });
        }

        if (message && customer.email) {
          await sendEmail(
            customer.email,
            isBirthday ? "Happy Birthday!" : "Happy Anniversary!",
            message
          );
        }
      } catch (error) {
        console.error(`[Birthday/Anniversary] Error sending to ${customer.mobileNumber}:`, error);
      }
    }

    return {
      success: true,
      offersSent: sentOffers.length,
      offers: sentOffers,
    };
  } catch (error) {
    console.error("[Birthday/Anniversary] Error:", error);
    return {
      success: false,
      message: "Failed to send birthday/anniversary offers",
      error: error.message,
    };
  }
}

/**
 * Check cashflow: Expense + Purchase vs Revenue
 */
async function checkCashflowAlert(branchId, startDate, endDate) {
  try {
    const Expense = require("../../model/Expense");
    const Order = require("../RestautantModel/RestaurantOrderModel");
    const PurchaseRequest = require("../../construction/models/PurchaseRequest");

    // Calculate total expenses
    const expenses = await Expense.aggregate([
      {
        $match: {
          branchId: branchId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const totalExpenses = expenses[0]?.total || 0;

    // Calculate total purchases (pending + approved)
    const purchases = await PurchaseRequest.aggregate([
      {
        $match: {
          branchId: branchId,
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ["Approved", "Pending"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalPurchases = purchases[0]?.total || 0;

    // Calculate total revenue
    const orders = await Order.aggregate([
      {
        $match: {
          branchId: branchId,
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: "completed",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
        },
      },
    ]);

    const totalRevenue = orders[0]?.total || 0;

    // Check if negative cashflow
    const totalOutflow = totalExpenses + totalPurchases;
    const netCashflow = totalRevenue - totalOutflow;
    const isNegative = netCashflow < 0;

    return {
      success: true,
      revenue: totalRevenue,
      expenses: totalExpenses,
      purchases: totalPurchases,
      netCashflow,
      isNegative,
      alert: isNegative
        ? `⚠️ Negative cashflow detected: ₹${Math.abs(netCashflow).toFixed(2)}`
        : null,
    };
  } catch (error) {
    console.error("[Cashflow Check] Error:", error);
    return {
      success: false,
      message: "Failed to check cashflow",
      error: error.message,
    };
  }
}

module.exports = {
  deductStockOnOrderCompletion,
  checkLowStockAndSuggestPurchase,
  updateCustomerCRM,
  sendBirthdayAnniversaryOffers,
  checkCashflowAlert,
};

