const Reservation = require("../model/Reservation");
const Table = require("../RestautantModel/RestaurantTabelModel");
const Customer = require("../model/customerModel");

const createReservation = async (req, res) => {
  try {
    console.log("Creating reservation with data:", req.body);

    const {
      tableId,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      guestCount,
      reservationDate,
      timeSlot,
      status,
      notes,
    } = req.body;

    if (
      !tableId ||
      !customerName ||
      !customerPhone ||
      !guestCount ||
      !reservationDate ||
      !timeSlot
    ) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    // Create or find customer
    let customer;
    if (customerId) {
      customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
    } else {
      // Create new customer
      customer = new Customer({
        name: customerName,
        mobileNumber: customerPhone,
        email: customerEmail || "",
      });
      await customer.save();
      console.log("Created new customer:", customer);
    }

    // Create reservation
    const reservation = new Reservation({
      tableId,
      customerId: customer._id,
      customerName,
      customerPhone,
      customerEmail: customerEmail || "",
      guestCount,
      reservationDate: new Date(reservationDate),
      timeSlot,
      status: status || "reserved",
      notes: notes || "",
    });

    const createdReservation = await reservation.save();
    console.log("Created reservation:", createdReservation);

    // Update table status to reserved
    await Table.findByIdAndUpdate(tableId, { status: "reserved" });

    // Populate the response
    const populatedReservation = await Reservation.findById(
  createdReservation._id
)
  .populate({
    path: "tableId",
    select: "number branchId status",
    populate: {
      path: "branchId",
      select: "name address"
    }
  })
  .populate("customerId", "name mobileNumber email");

    res.status(201).json(populatedReservation);
  } catch (err) {
    console.error("Error creating reservation:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get all reservations
// Get all reservations
const getReservations = async (req, res) => {
  try {
    console.log("Fetching reservations...");

    const { tableId, customerId, status, date } = req.query;

    const query = {};

    if (tableId) query.tableId = tableId;
    if (customerId) query.customerId = customerId;
    if (status) query.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.reservationDate = { $gte: startDate, $lt: endDate };
    }

    const reservations = await Reservation.find(query)
      .populate({
        path: "tableId",
        select: "number branchId status",
        populate: {
          path: "branchId",
          select: "name address" // Add other fields you need
        }
      })
      .populate("customerId", "name mobileNumber email")
      .sort({ reservationDate: 1, timeSlot: 1 });

    console.log("Found reservations:", reservations.length);
    res.json(reservations);
  } catch (err) {
    console.error("Error fetching reservations:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get reservation by ID
const getReservationById = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate({
        path: "tableId",
        select: "number branchId status",
        populate: {
          path: "branchId",
          select: "name address"
        }
      })
      .populate("customerId", "name mobileNumber email");

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    res.json(reservation);
  } catch (err) {
    console.error("Error fetching reservation:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update reservation
const updateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    const updatedReservation = await Reservation.findByIdAndUpdate(
  req.params.id,
  { status: "cancelled" },
  { new: true }
)
  .populate({
    path: "tableId",
    select: "number branchId status",
    populate: {
      path: "branchId",
      select: "name address"
    }
  })
  .populate("customerId", "name mobileNumber email");

    res.json(updatedReservation);
  } catch (err) {
    console.error("Error updating reservation:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete reservation
const deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    // Check if there are other active reservations for this table
    const otherReservations = await Reservation.find({
      tableId: reservation.tableId,
      _id: { $ne: req.params.id },
      status: { $in: ["reserved", "confirmed"] },
    });

    // Update table status back to available if no other active reservations
    if (otherReservations.length === 0) {
      await Table.findByIdAndUpdate(reservation.tableId, {
        status: "available",
      });
    }

    await Reservation.findByIdAndDelete(req.params.id);

    res.json({ message: "Reservation deleted successfully" });
  } catch (err) {
    console.error("Error deleting reservation:", err);
    res.status(500).json({ error: err.message });
  }
};

const cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    if (reservation.status === "cancelled") {
      return res.status(400).json({ error: "Reservation already cancelled" });
    }

    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status: "cancelled" },
      { new: true }
    )
      .populate("tableId", "number branchId")
      .populate("customerId", "name mobileNumber email");

    // Only update table status if tableId exists
    if (reservation.tableId) {
      const activeReservations = await Reservation.find({
        tableId: reservation.tableId,
        status: { $in: ["reserved", "confirmed"] },
      });

      if (activeReservations.length === 0) {
        await Table.findByIdAndUpdate(reservation.tableId, {
          status: "available",
        });
      }
    }

    res.json(updatedReservation);
  } catch (err) {
    console.error("Error cancelling reservation:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createReservation,
  getReservations,
  getReservationById,
  updateReservation,
  deleteReservation,
  cancelReservation,
};
