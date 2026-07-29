const asyncHandler = require("express-async-handler");
const CounterOrder = require("../model/counterOrderModel");
const StaffOrder = require("../model/staffOrderModel");
const Order = require("../model/orderModel");
const Branch = require("../model/Branch");
const Menu = require("../model/menuModel");
const mongoose = require("mongoose");

exports.getSalesReport = asyncHandler(async (req, res) => {
  const { period, from, to, branch, orderType } = req.query;

  // Build date filter
  let dateFilter = {};
  const now = new Date();
  if (period === "daily") {
    dateFilter = {
      $gte: new Date(now.setHours(0, 0, 0, 0)),
      $lte: new Date(now.setHours(23, 59, 59, 999)),
    };
  } else if (period === "weekly") {
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    dateFilter = {
      $gte: new Date(weekStart.setHours(0, 0, 0, 0)),
      $lte: new Date(now.setHours(23, 59, 59, 999)),
    };
  } else if (period === "monthly") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFilter = {
      $gte: new Date(monthStart.setHours(0, 0, 0, 0)),
      $lte: new Date(now.setHours(23, 59, 59, 999)),
    };
  } else if (period === "custom" && from && to) {
    dateFilter = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  // Build filters for each model
  const counterOrderFilter = {
    createdAt: dateFilter,
    ...(branch && branch !== "all" ? { branch: branch } : {}),
    orderStatus: { $ne: "cancelled" }, // Exclude cancelled orders
  };

  const staffOrderFilter = {
    createdAt: dateFilter,
    ...(branch && branch !== "all" ? { branchId: branch } : {}),
    status: { $ne: "cancelled" }, // Exclude cancelled orders
    ...(orderType && orderType !== "all"
      ? {
          isGuestOrder:
            orderType === "guest"
              ? true
              : orderType === "staff"
              ? false
              : undefined,
        }
      : {}),
  };

  const onlineOrderFilter = {
    createdAt: dateFilter,
    ...(branch && branch !== "all" ? { branchId: branch } : {}),
    status: { $ne: "cancelled" }, // Exclude cancelled orders
  };

  // Aggregate data from CounterOrder
  const counterOrderAggregation = CounterOrder.aggregate([
    { $match: counterOrderFilter },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "menus",
        localField: "items.menuItemId",
        foreignField: "_id",
        as: "menuItem",
      },
    },
    { $unwind: { path: "$menuItem", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "categories",
        localField: "menuItem.categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "branches",
        localField: "branch",
        foreignField: "_id",
        as: "branchData",
      },
    },
    { $unwind: { path: "$branchData", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: {
          itemName: "$items.name",
          category: "$category.name",
          branch: "$branchData.name",
        },
        quantitySold: { $sum: "$items.quantity" },
        totalRevenue: {
          $sum: { $multiply: ["$items.quantity", "$items.price"] },
        },
        unitPrice: { $avg: "$items.price" },
        orderDates: { $push: "$createdAt" },
      },
    },
  ]);

  // Aggregate data from StaffOrder
  const staffOrderAggregation = StaffOrder.aggregate([
    {
      $match: {
        ...staffOrderFilter,
        ...(orderType &&
        orderType !== "all" &&
        orderType !== "online" &&
        orderType !== "counter"
          ? { isGuestOrder: orderType === "guest" ? true : false }
          : {}),
      },
    },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "menus",
        localField: "items.menuItemId",
        foreignField: "_id",
        as: "menuItem",
      },
    },
    { $unwind: { path: "$menuItem", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "categories",
        localField: "menuItem.categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "branches",
        localField: "branchId",
        foreignField: "_id",
        as: "branchData",
      },
    },
    { $unwind: { path: "$branchData", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: {
          itemName: "$items.name",
          category: "$category.name",
          branch: "$branchData.name",
        },
        quantitySold: { $sum: "$items.quantity" },
        totalRevenue: {
          $sum: { $multiply: ["$items.quantity", "$items.price"] },
        },
        unitPrice: { $avg: "$items.price" },
        orderDates: { $push: "$createdAt" },
      },
    },
  ]);

  // Aggregate data from Order
  const onlineOrderAggregation = Order.aggregate([
    { $match: onlineOrderFilter },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "menus",
        localField: "items.menuItemId",
        foreignField: "_id",
        as: "menuItem",
      },
    },
    { $unwind: { path: "$menuItem", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "categories",
        localField: "menuItem.categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "branches",
        localField: "branchId",
        foreignField: "_id",
        as: "branchData",
      },
    },
    { $unwind: { path: "$branchData", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: {
          itemName: "$items.name",
          category: "$category.name",
          branch: "$branchData.name",
        },
        quantitySold: { $sum: "$items.quantity" },
        totalRevenue: {
          $sum: { $multiply: ["$items.quantity", "$items.price"] },
        },
        unitPrice: { $avg: "$items.price" },
        orderDates: { $push: "$createdAt" },
      },
    },
  ]);

  // Execute aggregations based on orderType
  let salesData = [];
  if (!orderType || orderType === "all" || orderType === "counter") {
    const counterData = await counterOrderAggregation;
    salesData = [
      ...salesData,
      ...counterData.map((item) => ({ ...item, orderType: "counter" })),
    ];
  }
  if (
    !orderType ||
    orderType === "all" ||
    orderType === "staff" ||
    orderType === "guest"
  ) {
    const staffData = await staffOrderAggregation;
    salesData = [
      ...salesData,
      ...staffData.map((item) => ({
        ...item,
        orderType: item._id.isGuestOrder ? "guest" : "staff",
      })),
    ];
  }
  if (!orderType || orderType === "all" || orderType === "online") {
    const onlineData = await onlineOrderAggregation;
    salesData = [
      ...salesData,
      ...onlineData.map((item) => ({ ...item, orderType: "online" })),
    ];
  }

  // Combine and group data
  const combinedData = salesData.reduce((acc, curr) => {
    const key = `${curr._id.itemName}-${curr._id.category}-${curr._id.branch}-${curr.orderType}`;
    if (!acc[key]) {
      acc[key] = {
        itemName: curr._id.itemName || "Unknown Item",
        category: curr._id.category || "Uncategorized",
        branch: curr._id.branch || "Unknown Branch",
        orderType: curr.orderType,
        quantitySold: 0,
        totalRevenue: 0,
        unitPrice: 0,
        orderDates: [],
      };
    }
    acc[key].quantitySold += curr.quantitySold;
    acc[key].totalRevenue += curr.totalRevenue;
    acc[key].unitPrice = curr.totalRevenue / curr.quantitySold; // Weighted average
    acc[key].orderDates.push(...curr.orderDates);
    return acc;
  }, {});

  // Format final output
  const formattedData = Object.values(combinedData).map((item) => ({
    itemName: item.itemName,
    category: item.category,
    branch: item.branch,
    orderType: item.orderType,
    quantitySold: item.quantitySold,
    unitPrice: Number(item.unitPrice.toFixed(2)),
    totalRevenue: Number(item.totalRevenue.toFixed(2)),
    topSellingTime: item.orderDates.length
      ? `${new Date(item.orderDates[0]).getHours()}:00 - ${
          new Date(item.orderDates[0]).getHours() + 1
        }:00`
      : "N/A",
  }));

  // Filter by orderType if specified
  const filteredData =
    orderType && orderType !== "all"
      ? formattedData.filter((item) => item.orderType === orderType)
      : formattedData;

  res.status(200).json(filteredData);
});

exports.getBranches = asyncHandler(async (req, res) => {
  const branches = await Branch.find({}, "name _id");
  res.status(200).json(
    branches.map((branch) => ({
      id: branch._id.toString(),
      name: branch.name,
    }))
  );
});

exports.getOrderTypes = asyncHandler(async (req, res) => {
  const orderTypes = [
    { id: "online", name: "Online Order", icon: "ShoppingCart" },
    { id: "counter", name: "Counter Order", icon: "Package" },
    { id: "staff", name: "Staff Order", icon: "Users" },
    { id: "guest", name: "Guest Order", icon: "User" },
  ];
  res.status(200).json(orderTypes);
});

exports.getItems = asyncHandler(async (req, res) => {
  const items = await Menu.distinct("name");
  res.status(200).json(items.map((item) => ({ name: item })));
});
