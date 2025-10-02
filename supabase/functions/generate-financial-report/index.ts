import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple CSV generation function
const generateCSV = (data: any[], headers: string[]): string => {
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes in CSV
      return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    }).join(','))
  ].join('\n');
  
  return csvContent;
};

// Simple HTML to "PDF-like" format (HTML with print styles)
const generateHTMLReport = (reportData: any): string => {
  const { summary, transactions, budgets, goals, reportDate, reportPeriod } = reportData;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Financial Report - ${reportPeriod}</title>
    <style>
        @media print {
            body { margin: 0.5in; }
            .page-break { page-break-before: always; }
        }
        body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #2563eb;
            margin-bottom: 5px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #1f2937;
            border-left: 4px solid #2563eb;
            padding-left: 15px;
            margin-bottom: 15px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .summary-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #64748b;
            font-size: 14px;
            text-transform: uppercase;
        }
        .summary-card .amount {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
        }
        .income { color: #059669; }
        .expense { color: #dc2626; }
        .savings { color: #7c3aed; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        table th, table td {
            border: 1px solid #e2e8f0;
            padding: 12px;
            text-align: left;
        }
        table th {
            background: #f1f5f9;
            font-weight: bold;
            color: #374151;
        }
        table tr:nth-child(even) {
            background: #f8fafc;
        }
        .progress-bar {
            background: #e2e8f0;
            border-radius: 10px;
            height: 20px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: #2563eb;
            transition: width 0.3s ease;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Financial Report</h1>
        <p>Report Period: ${reportPeriod}</p>
        <p>Generated: ${new Date(reportDate).toLocaleDateString()}</p>
    </div>

    <div class="section">
        <h2>Financial Summary</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <h3>Total Income</h3>
                <div class="amount income">$${summary.totalIncome.toLocaleString()}</div>
            </div>
            <div class="summary-card">
                <h3>Total Expenses</h3>
                <div class="amount expense">$${summary.totalExpenses.toLocaleString()}</div>
            </div>
            <div class="summary-card">
                <h3>Net Worth</h3>
                <div class="amount ${summary.netWorth >= 0 ? 'income' : 'expense'}">$${summary.netWorth.toLocaleString()}</div>
            </div>
            <div class="summary-card">
                <h3>Savings Rate</h3>
                <div class="amount savings">${summary.savingsRate.toFixed(1)}%</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Budget Performance</h2>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Allocated</th>
                    <th>Spent</th>
                    <th>Remaining</th>
                    <th>Usage</th>
                </tr>
            </thead>
            <tbody>
                ${budgets.map((budget: any) => `
                    <tr>
                        <td>${budget.category}</td>
                        <td>$${budget.allocated.toLocaleString()}</td>
                        <td>$${budget.spent.toLocaleString()}</td>
                        <td>$${(budget.allocated - budget.spent).toLocaleString()}</td>
                        <td>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min((budget.spent / budget.allocated) * 100, 100)}%"></div>
                            </div>
                            ${((budget.spent / budget.allocated) * 100).toFixed(1)}%
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Savings Goals</h2>
        <table>
            <thead>
                <tr>
                    <th>Goal</th>
                    <th>Target</th>
                    <th>Current</th>
                    <th>Progress</th>
                    <th>Deadline</th>
                </tr>
            </thead>
            <tbody>
                ${goals.map((goal: any) => `
                    <tr>
                        <td>${goal.name}</td>
                        <td>$${goal.target_amount.toLocaleString()}</td>
                        <td>$${goal.current_amount.toLocaleString()}</td>
                        <td>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%"></div>
                            </div>
                            ${((goal.current_amount / goal.target_amount) * 100).toFixed(1)}%
                        </td>
                        <td>${new Date(goal.deadline).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section page-break">
        <h2>Recent Transactions</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.slice(0, 50).map((tx: any) => `
                    <tr>
                        <td>${new Date(tx.date).toLocaleDateString()}</td>
                        <td>${tx.description}</td>
                        <td>${tx.category}</td>
                        <td>${tx.type}</td>
                        <td class="${tx.type}">${tx.type === 'expense' ? '-' : '+'}$${tx.amount.toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${transactions.length > 50 ? `<p><em>Showing 50 most recent transactions out of ${transactions.length} total.</em></p>` : ''}
    </div>

    <div class="footer">
        <p>Generated by BudgetBuddy AI Financial Management System</p>
        <p>This report contains confidential financial information</p>
    </div>
</body>
</html>
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { format = 'html', period = 'last_30_days' } = await req.json();

    console.log(`Generating ${format} report for period: ${period}`);

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'last_7_days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'last_30_days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'last_90_days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'current_month':
        startDate.setDate(1);
        break;
      case 'last_month':
        startDate.setMonth(endDate.getMonth() - 1, 1);
        endDate.setDate(0); // Last day of previous month
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Fetch all data
    const [transactionsRes, budgetsRes, goalsRes] = await Promise.all([
      supabaseClient
        .from('transactions')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false }),
      supabaseClient.from('budgets').select('*'),
      supabaseClient.from('savings_goals').select('*')
    ]);

    const transactions = transactionsRes.data || [];
    const budgets = budgetsRes.data || [];
    const goals = goalsRes.data || [];

    // Calculate summary data
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const netWorth = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netWorth / totalIncome) * 100) : 0;

    const reportData = {
      summary: {
        totalIncome,
        totalExpenses,
        netWorth,
        savingsRate
      },
      transactions,
      budgets,
      goals,
      reportDate: new Date().toISOString(),
      reportPeriod: period.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    };

    if (format === 'csv') {
      // Generate CSV for transactions
      const csvHeaders = ['date', 'description', 'amount', 'category', 'type'];
      const csvContent = generateCSV(transactions, csvHeaders);
      
      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="financial-report-${period}.csv"`
        },
      });
    } else {
      // Generate HTML report
      const htmlContent = generateHTMLReport(reportData);
      
      return new Response(htmlContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="financial-report-${period}.html"`
        },
      });
    }

  } catch (error) {
    console.error('Error generating financial report:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate financial report',
      details: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});