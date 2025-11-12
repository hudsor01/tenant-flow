"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeNumber = safeNumber;
exports.calculatePercentChange = calculatePercentChange;
exports.calculatePeriodComparison = calculatePeriodComparison;
exports.formatPeriodLabel = formatPeriodLabel;
exports.createFinancialPeriod = createFinancialPeriod;
exports.validateBalanceSheet = validateBalanceSheet;
exports.calculateProfitMargin = calculateProfitMargin;
exports.mapToIncomeStatement = mapToIncomeStatement;
exports.mapToCashFlow = mapToCashFlow;
exports.mapToBalanceSheet = mapToBalanceSheet;
exports.mapToTaxDocuments = mapToTaxDocuments;
exports.formatCurrency = formatCurrency;
exports.formatPercentage = formatPercentage;
function safeNumber(value) {
    if (value === null || value === undefined)
        return 0;
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}
function calculatePercentChange(current, previous) {
    if (previous === 0)
        return current === 0 ? 0 : 100;
    return ((current - previous) / Math.abs(previous)) * 100;
}
function calculatePeriodComparison(currentValue, previousValue) {
    const changeAmount = currentValue - previousValue;
    const changePercent = calculatePercentChange(currentValue, previousValue);
    return {
        currentValue,
        previousValue,
        changeAmount,
        changePercent
    };
}
function formatPeriodLabel(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const year = end.getFullYear();
    if (startMonth === endMonth) {
        return `${startMonth} ${year}`;
    }
    if (start.getFullYear() === end.getFullYear()) {
        return `${startMonth} - ${endMonth} ${year}`;
    }
    return `${startMonth} ${start.getFullYear()} - ${endMonth} ${year}`;
}
function createFinancialPeriod(startDate, endDate) {
    return {
        startDate,
        endDate,
        label: formatPeriodLabel(startDate, endDate)
    };
}
function validateBalanceSheet(data) {
    const tolerance = 0.01;
    const difference = Math.abs(data.assets.totalAssets -
        (data.liabilities.totalLiabilities + data.equity.totalEquity));
    return difference < tolerance;
}
function calculateProfitMargin(netIncome, totalRevenue) {
    if (totalRevenue === 0)
        return 0;
    return (netIncome / totalRevenue) * 100;
}
function mapToIncomeStatement(raw) {
    if (!raw || typeof raw !== 'object') {
        return {};
    }
    const data = raw;
    return {
        revenue: {
            rentalIncome: safeNumber(data.rental_income),
            lateFeesIncome: safeNumber(data.late_fees_income),
            otherIncome: safeNumber(data.other_income),
            totalRevenue: safeNumber(data.total_revenue)
        },
        expenses: {
            propertyManagement: safeNumber(data.property_management),
            maintenance: safeNumber(data.maintenance),
            utilities: safeNumber(data.utilities),
            insurance: safeNumber(data.insurance),
            propertyTax: safeNumber(data.property_tax),
            mortgage: safeNumber(data.mortgage),
            other: safeNumber(data.other_expenses),
            totalExpenses: safeNumber(data.total_expenses)
        },
        grossProfit: safeNumber(data.gross_profit),
        operatingIncome: safeNumber(data.operating_income),
        netIncome: safeNumber(data.net_income),
        profitMargin: safeNumber(data.profit_margin)
    };
}
function mapToCashFlow(raw) {
    if (!raw || typeof raw !== 'object') {
        return {};
    }
    const data = raw;
    return {
        operatingActivities: {
            rentalPaymentsReceived: safeNumber(data.rental_payments_received),
            operatingExpensesPaid: safeNumber(data.operating_expenses_paid),
            maintenancePaid: safeNumber(data.maintenance_paid),
            netOperatingCash: safeNumber(data.net_operating_cash)
        },
        investingActivities: {
            propertyAcquisitions: safeNumber(data.property_acquisitions),
            propertyImprovements: safeNumber(data.property_improvements),
            netInvestingCash: safeNumber(data.net_investing_cash)
        },
        financingActivities: {
            mortgagePayments: safeNumber(data.mortgage_payments),
            loanProceeds: safeNumber(data.loan_proceeds),
            ownerContributions: safeNumber(data.owner_contributions),
            ownerDistributions: safeNumber(data.owner_distributions),
            netFinancingCash: safeNumber(data.net_financing_cash)
        },
        netCashFlow: safeNumber(data.net_cash_flow),
        beginningCash: safeNumber(data.beginning_cash),
        endingCash: safeNumber(data.ending_cash)
    };
}
function mapToBalanceSheet(raw) {
    if (!raw || typeof raw !== 'object') {
        return {};
    }
    const data = raw;
    const assets = {
        currentAssets: {
            cash: safeNumber(data.cash),
            accountsReceivable: safeNumber(data.accounts_receivable),
            securityDeposits: safeNumber(data.security_deposits),
            total: safeNumber(data.current_assets_total)
        },
        fixedAssets: {
            propertyValues: safeNumber(data.property_values),
            accumulatedDepreciation: safeNumber(data.accumulated_depreciation),
            netPropertyValue: safeNumber(data.net_property_value),
            total: safeNumber(data.fixed_assets_total)
        },
        totalAssets: safeNumber(data.total_assets)
    };
    const liabilities = {
        currentLiabilities: {
            accountsPayable: safeNumber(data.accounts_payable),
            securityDepositLiability: safeNumber(data.security_deposit_liability),
            accruedExpenses: safeNumber(data.accrued_expenses),
            total: safeNumber(data.current_liabilities_total)
        },
        longTermLiabilities: {
            mortgagesPayable: safeNumber(data.mortgages_payable),
            total: safeNumber(data.long_term_liabilities_total)
        },
        totalLiabilities: safeNumber(data.total_liabilities)
    };
    const equity = {
        ownerCapital: safeNumber(data.owner_capital),
        retainedEarnings: safeNumber(data.retained_earnings),
        currentPeriodIncome: safeNumber(data.current_period_income),
        totalEquity: safeNumber(data.total_equity)
    };
    return {
        assets,
        liabilities,
        equity,
        balanceCheck: Math.abs(assets.totalAssets - (liabilities.totalLiabilities + equity.totalEquity)) < 0.01
    };
}
function mapToTaxDocuments(raw) {
    if (!raw || typeof raw !== 'object') {
        return {};
    }
    const data = raw;
    return {
        taxYear: safeNumber(data.tax_year),
        incomeBreakdown: {
            grossRentalIncome: safeNumber(data.gross_rental_income),
            totalExpenses: safeNumber(data.total_expenses),
            netOperatingIncome: safeNumber(data.net_operating_income),
            depreciation: safeNumber(data.depreciation),
            mortgageInterest: safeNumber(data.mortgage_interest),
            taxableIncome: safeNumber(data.taxable_income)
        },
        totals: {
            totalIncome: safeNumber(data.total_income),
            totalDeductions: safeNumber(data.total_deductions),
            netTaxableIncome: safeNumber(data.net_taxable_income)
        }
    };
}
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}
function formatPercentage(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
}
//# sourceMappingURL=financial-statements.js.map