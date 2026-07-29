/**
 * Auto-Priority Calculator for Kitchen Display System
 * Assigns priority based on order attributes
 */

function calculateOrderPriority(orderData) {
  let priorityScore = 0;
  let priority = 'normal';

  // Factors affecting priority:
  
  // 1. Order Value (Higher value = Higher priority)
  const orderValue = orderData.grandTotal || orderData.totalAmount || 0;
  if (orderValue > 2000) priorityScore += 40;
  else if (orderValue > 1000) priorityScore += 20;
  else if (orderValue > 500) priorityScore += 10;

  // 2. Customer Type
  if (orderData.isGuestOrder) priorityScore += 15; // Guest orders get priority
  if (orderData.tags && orderData.tags.includes('VIP')) priorityScore += 50; // VIP customers

  // 3. People Count
  const peopleCount = orderData.peopleCount || 1;
  if (peopleCount > 6) priorityScore += 15; // Large groups
  else if (peopleCount > 4) priorityScore += 10;

  // 4. Order Source
  const orderSource = orderData.orderSource || orderData.originalOrderType;
  if (orderSource === 'online') {
    // Online delivery - check delivery option
    if (orderData.deliveryOption === 'express' || orderData.deliveryOption === 'instant') {
      priorityScore += 35;
    } else if (orderData.deliveryOption === 'delivery') {
      priorityScore += 20;
    }
  } else if (orderSource === 'dine-in') {
    // Dine-in orders - prioritize if table is already seated
    priorityScore += 10;
  }

  // 5. Time of Day (Rush hours get priority)
  const hour = new Date().getHours();
  if ((hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21)) {
    priorityScore += 10; // Lunch or dinner rush
  }

  // 6. Special Instructions
  if (orderData.notes && orderData.notes.toLowerCase().includes('urgent')) {
    priorityScore += 30;
  }
  if (orderData.specialInstructions && orderData.specialInstructions.toLowerCase().includes('asap')) {
    priorityScore += 25;
  }

  // 7. Payment Status (Paid orders get priority)
  if (orderData.paymentStatus === 'completed' || orderData.paymentStatus === 'paid') {
    priorityScore += 15;
  }

  // Determine priority level based on score
  if (priorityScore >= 80) {
    priority = 'VIP';
  } else if (priorityScore >= 60) {
    priority = 'urgent';
  } else if (priorityScore >= 40) {
    priority = 'high';
  } else if (priorityScore >= 20) {
    priority = 'normal';
  } else {
    priority = 'low';
  }

  console.log(`📊 Priority calculated: ${priority} (score: ${priorityScore})`);
  
  return {
    priority,
    priorityScore,
    factors: {
      orderValue,
      peopleCount,
      orderSource,
      hasVIPTag: orderData.tags && orderData.tags.includes('VIP'),
      isGuestOrder: orderData.isGuestOrder,
      isRushHour: (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21),
      paid: orderData.paymentStatus === 'completed'
    }
  };
}

module.exports = { calculateOrderPriority };












