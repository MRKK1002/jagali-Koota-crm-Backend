const mongoose = require('mongoose');
const Report = require('../model/Report');
require('dotenv').config();

const seedReports = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/construction_crm');
    console.log('Connected to MongoDB');

    // Clear existing reports
    await Report.deleteMany({});
    console.log('Cleared existing reports');

    // Sample reports data
    const sampleReports = [
      {
        name: 'Monthly GST Report - October 2024',
        reportType: 'gst',
        description: 'GST compliance report for October 2024',
        status: 'Complete',
        parameters: {
          fromDate: '2024-10-01',
          toDate: '2024-10-31',
          gstPeriod: 'monthly'
        },
        data: {
          period: 'monthly',
          fromDate: '2024-10-01',
          toDate: '2024-10-31',
          totalInvoices: 15,
          totalAmount: 250000,
          invoices: [
            {
              invoiceNumber: 'INV-001',
              clientName: 'ABC Construction',
              totalAmount: 50000,
              outstandingAmount: 10000,
              invoiceDate: '2024-10-15',
              paymentStatus: 'Partial'
            },
            {
              invoiceNumber: 'INV-002',
              clientName: 'XYZ Builders',
              totalAmount: 75000,
              outstandingAmount: 0,
              invoiceDate: '2024-10-20',
              paymentStatus: 'Paid'
            }
          ]
        }
      },
      {
        name: 'Project Progress Report - Q4 2024',
        reportType: 'project-progress',
        description: 'Fourth quarter project progress summary',
        status: 'Complete',
        parameters: {
          fromDate: '2024-10-01',
          toDate: '2024-12-31'
        },
        data: {
          type: 'project-wise',
          projects: {
            'Residential Complex A': {
              totalInvoices: 8,
              totalAmount: 120000,
              outstandingAmount: 20000
            },
            'Commercial Building B': {
              totalInvoices: 5,
              totalAmount: 80000,
              outstandingAmount: 15000
            }
          }
        }
      },
      {
        name: 'Client-wise Revenue Report',
        reportType: 'client',
        description: 'Revenue breakdown by client for current quarter',
        status: 'Complete',
        parameters: {
          fromDate: '2024-10-01',
          toDate: '2024-12-31'
        },
        data: {
          type: 'client-wise',
          clients: {
            'ABC Construction': {
              totalInvoices: 6,
              totalAmount: 95000,
              outstandingAmount: 15000
            },
            'XYZ Builders': {
              totalInvoices: 4,
              totalAmount: 65000,
              outstandingAmount: 5000
            },
            'PQR Developers': {
              totalInvoices: 3,
              totalAmount: 45000,
              outstandingAmount: 8000
            }
          }
        }
      },
      {
        name: 'Outstanding Payments Report',
        reportType: 'outstanding',
        description: 'List of all pending payments from clients',
        status: 'Complete',
        parameters: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        },
        data: {
          type: 'outstanding',
          invoices: [
            {
              invoiceNumber: 'INV-001',
              clientName: 'ABC Construction',
              outstandingAmount: 15000,
              dueDate: '2024-11-15'
            },
            {
              invoiceNumber: 'INV-005',
              clientName: 'PQR Developers',
              outstandingAmount: 8000,
              dueDate: '2024-11-30'
            }
          ]
        }
      },
      {
        name: 'Financial Summary - November 2024',
        reportType: 'financial',
        description: 'Complete financial overview for November',
        status: 'Complete',
        parameters: {
          fromDate: '2024-11-01',
          toDate: '2024-11-30'
        },
        data: {
          type: 'monthly',
          months: {
            'November 2024': {
              totalInvoices: 12,
              totalAmount: 180000
            }
          }
        }
      }
    ];

    // Insert sample reports
    const insertedReports = await Report.insertMany(sampleReports);
    console.log(`Inserted ${insertedReports.length} sample reports`);

    console.log('Sample reports seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding reports:', error);
    process.exit(1);
  }
};

// Run the seeding function
seedReports();