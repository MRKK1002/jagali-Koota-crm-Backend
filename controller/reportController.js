const Invoice = require('../model/ConstructionSalesInvoice');
const Payment = require('../model/ConstructionPayment');
const Report = require('../model/Report');

// Get reports with filters and pagination
exports.getReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type, fromDate, toDate } = req.query;
    
    const skip = (page - 1) * parseInt(limit);
    
    // Build query based on filters
    const query = {};
    if (fromDate && toDate) {
      query.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      };
    }
    if (type && type !== 'all') {
      query.reportType = type;
    }

    // Fetch reports from database
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('generatedBy', 'name email')
      .lean();

    // Get total count for pagination
    const totalReports = await Report.countDocuments(query);
    
    // Transform data for frontend
    const transformedReports = reports.map(report => ({
      id: report._id,
      name: report.name,
      reportType: report.reportType,
      description: report.description,
      status: report.status,
      generatedAt: report.createdAt,
      parameters: report.parameters || {},
      generatedBy: report.generatedBy
    }));
    
    res.status(200).json({
      success: true,
      data: transformedReports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReports / parseInt(limit)),
        totalReports: totalReports,
        hasNext: page < Math.ceil(totalReports / parseInt(limit)),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    next(error);
  }
};

// Generate a new report
exports.generateReport = async (req, res, next) => {
  try {
    const { reportType, fromDate, toDate, clientId, gstPeriod, name, description } = req.body;

    if (!reportType) {
      return res.status(400).json({ 
        success: false,
        message: 'Report type is required' 
      });
    }

    let reportData;

    // Route to appropriate report generator based on type
    switch (reportType) {
      case 'gst':
        reportData = await exports.generateGSTReportData(fromDate, toDate, gstPeriod);
        break;
      case 'project-progress':
      case 'financial':
      case 'attendance':
      case 'material':
      case 'safety':
      case 'client':
      case 'payment':
      case 'outstanding':
      case 'monthly':
        reportData = await exports.generateCustomReportData(fromDate, toDate, clientId, reportType);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    // Save the report to database
    const newReport = new Report({
      name: name || `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report - ${new Date().toLocaleDateString()}`,
      reportType: reportType,
      description: description || `Generated report for ${fromDate || 'N/A'} to ${toDate || 'N/A'}`,
      status: 'Complete',
      parameters: { 
        fromDate, 
        toDate, 
        clientId, 
        gstPeriod 
      },
      data: reportData,
      // generatedBy: req.user?.id // Add this when authentication is implemented
    });

    const savedReport = await newReport.save();

    res.status(201).json({
      success: true,
      message: 'Report generated successfully',
      data: {
        id: savedReport._id,
        name: savedReport.name,
        reportType: savedReport.reportType,
        description: savedReport.description,
        status: savedReport.status,
        generatedAt: savedReport.createdAt,
        parameters: savedReport.parameters
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    next(error);
  }
};

// Download a report as PDF
exports.downloadReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch report from database
    const report = await Report.findById(id).lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Generate PDF using PDFKit
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    
    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${id}-${new Date().toISOString().split('T')[0]}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add content to PDF
    doc.fontSize(20).text('Construction Report', 100, 100);
    doc.fontSize(14).text(`Report Name: ${report.name}`, 100, 130);
    doc.text(`Report ID: ${report._id}`, 100, 150);
    doc.text(`Generated: ${new Date(report.createdAt).toLocaleDateString()}`, 100, 170);
    doc.text(`Report Type: ${report.reportType.toUpperCase()}`, 100, 190);
    
    if (report.description) {
      doc.text(`Description: ${report.description}`, 100, 210);
    }
    
    // Add report data
    doc.fontSize(16).text('Report Data:', 100, 240);
    
    if (report.data && report.data.invoices) {
      doc.fontSize(12).text(`Total Invoices: ${report.data.totalInvoices || 0}`, 100, 270);
      doc.text(`Total Amount: ₹${report.data.totalAmount || 0}`, 100, 290);
      doc.text(`Period: ${report.data.fromDate} to ${report.data.toDate}`, 100, 310);
      
      // Add invoice details
      let yPosition = 340;
      doc.fontSize(14).text('Invoice Details:', 100, yPosition);
      yPosition += 30;
      
      if (report.data.invoices && report.data.invoices.length > 0) {
        report.data.invoices.slice(0, 15).forEach((invoice, index) => {
          doc.fontSize(10)
             .text(`${index + 1}. ${invoice.invoiceNumber || 'N/A'} - ${invoice.clientName || 'Unknown'} - ₹${invoice.totalAmount || 0}`, 100, yPosition);
          yPosition += 20;
          
          // Add new page if needed
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 100;
          }
        });
      }
    } else if (report.data && report.data.clients) {
      // Handle client-wise report
      doc.fontSize(12).text('Client-wise Summary:', 100, 270);
      let yPosition = 300;
      
      Object.entries(report.data.clients).forEach(([clientName, data]) => {
        doc.fontSize(10)
           .text(`${clientName}: ₹${data.totalAmount || 0} (${data.totalInvoices || 0} invoices)`, 100, yPosition);
        yPosition += 20;
        
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 100;
        }
      });
    } else if (report.data && report.data.projects) {
      // Handle project-wise report
      doc.fontSize(12).text('Project-wise Summary:', 100, 270);
      let yPosition = 300;
      
      Object.entries(report.data.projects).forEach(([projectName, data]) => {
        doc.fontSize(10)
           .text(`${projectName}: ₹${data.totalAmount || 0} (${data.totalInvoices || 0} invoices)`, 100, yPosition);
        yPosition += 20;
        
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 100;
        }
      });
    } else {
      doc.fontSize(12).text('No detailed data available for this report.', 100, 270);
    }
    
    // Add footer
    doc.fontSize(8).text('Generated by WaveCRM Construction Management System', 100, 750);
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('PDF generation error:', error);
    next(error);
  }
};

// Edit a report
exports.editReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, reportType, parameters } = req.body;

    // Find and update report in database
    const updatedReport = await Report.findByIdAndUpdate(
      id,
      {
        name,
        description,
        reportType,
        parameters
      },
      { new: true, runValidators: true }
    );

    if (!updatedReport) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      data: {
        id: updatedReport._id,
        name: updatedReport.name,
        reportType: updatedReport.reportType,
        description: updatedReport.description,
        status: updatedReport.status,
        generatedAt: updatedReport.createdAt,
        parameters: updatedReport.parameters
      }
    });
  } catch (error) {
    console.error('Edit report error:', error);
    next(error);
  }
};

// Delete a report
exports.deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find and delete report from database
    const deletedReport = await Report.findByIdAndDelete(id);

    if (!deletedReport) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
      data: { id: deletedReport._id }
    });
  } catch (error) {
    console.error('Delete report error:', error);
    next(error);
  }
};

// Helper function for GST report data
exports.generateGSTReportData = async (fromDate, toDate, gstPeriod) => {
  try {
    if (!fromDate || !toDate) {
      throw new Error('From and to dates are required');
    }

    const invoices = await Invoice.find({
      invoiceDate: { $gte: new Date(fromDate), $lte: new Date(toDate) },
    })
      .populate({
        path: 'clientId',
        select: 'clientName',
        options: { strictPopulate: false },
      })
      .lean();

    return {
      period: gstPeriod || 'monthly',
      fromDate,
      toDate,
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
      invoices: invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientId?.clientName || 'Unknown',
        totalAmount: inv.totalAmount,
        outstandingAmount: inv.outstandingAmount,
        invoiceDate: inv.invoiceDate,
        paymentStatus: inv.paymentStatus,
      })),
    };
  } catch (error) {
    throw error;
  }
};

// Helper function for custom report data
exports.generateCustomReportData = async (fromDate, toDate, clientId, reportType) => {
  try {
    if (!fromDate || !toDate) {
      throw new Error('From and to dates are required');
    }

    const query = { invoiceDate: { $gte: new Date(fromDate), $lte: new Date(toDate) } };
    if (clientId) query.clientId = clientId;

    const invoices = await Invoice.find(query)
      .populate({
        path: 'clientId',
        select: 'clientName',
        options: { strictPopulate: false },
      })
      .populate({
        path: 'projectId',
        select: 'projectName',
        options: { strictPopulate: false },
      })
      .lean();

    const payments = await Payment.find({
      paymentDate: { $gte: new Date(fromDate), $lte: new Date(toDate) },
    })
      .populate({
        path: 'invoiceId',
        select: 'invoiceNumber clientId',
        options: { strictPopulate: false },
      })
      .lean();

    let report;
    switch (reportType) {
      case 'client-wise':
        report = {
          type: 'client-wise',
          clients: invoices.reduce((acc, inv) => {
            const clientName = inv.clientId?.clientName || 'Unknown';
            if (!acc[clientName]) {
              acc[clientName] = { totalInvoices: 0, totalAmount: 0, outstandingAmount: 0 };
            }
            acc[clientName].totalInvoices += 1;
            acc[clientName].totalAmount += inv.totalAmount || 0;
            acc[clientName].outstandingAmount += inv.outstandingAmount || 0;
            return acc;
          }, {}),
        };
        break;
      case 'payment-summary':
        report = {
          type: 'payment-summary',
          totalPayments: payments.length,
          totalAmount: payments.reduce((sum, pay) => sum + (pay.amount || 0), 0),
          payments: payments.map((pay) => ({
            paymentNumber: pay.paymentNumber,
            amount: pay.amount,
            paymentDate: pay.paymentDate,
            clientName: pay.invoiceId?.clientId?.clientName || 'Unknown',
          })),
        };
        break;
      case 'outstanding':
        report = {
          type: 'outstanding',
          invoices: invoices
            .filter((inv) => inv.outstandingAmount > 0)
            .map((inv) => ({
              invoiceNumber: inv.invoiceNumber,
              clientName: inv.clientId?.clientName || 'Unknown',
              outstandingAmount: inv.outstandingAmount,
              dueDate: inv.dueDate,
            })),
        };
        break;
      case 'monthly':
        report = {
          type: 'monthly',
          months: invoices.reduce((acc, inv) => {
            const month = new Date(inv.invoiceDate).toLocaleString('en-US', { month: 'long', year: 'numeric' });
            if (!acc[month]) {
              acc[month] = { totalInvoices: 0, totalAmount: 0 };
            }
            acc[month].totalInvoices += 1;
            acc[month].totalAmount += inv.totalAmount || 0;
            return acc;
          }, {}),
        };
        break;
      case 'project-wise':
        report = {
          type: 'project-wise',
          projects: invoices.reduce((acc, inv) => {
            const projectName = inv.projectId?.projectName || 'Unknown';
            if (!acc[projectName]) {
              acc[projectName] = { totalInvoices: 0, totalAmount: 0, outstandingAmount: 0 };
            }
            acc[projectName].totalInvoices += 1;
            acc[projectName].totalAmount += inv.totalAmount || 0;
            acc[projectName].outstandingAmount += inv.outstandingAmount || 0;
            return acc;
          }, {}),
        };
        break;
      default:
        report = { type: 'unknown', message: 'Invalid report type' };
    }

    return report;
  } catch (error) {
    throw error;
  }
};

// Keep your original functions for backward compatibility
exports.generateGSTReport = async (req, res, next) => {
  try {
    const { fromDate, toDate, gstPeriod } = req.body;
    const reportData = await exports.generateGSTReportData(fromDate, toDate, gstPeriod);
    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    next(error);
  }
};

exports.generateCustomReport = async (req, res, next) => {
  try {
    const { fromDate, toDate, clientId, reportType } = req.body;
    const reportData = await exports.generateCustomReportData(fromDate, toDate, clientId, reportType);
    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    next(error);
  }
};