import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Table component interfaces
interface TableProps {
  children: React.ReactNode;
  className?: string;
}

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
}

interface TableCellProps {
  children: React.ReactNode;
  isHeader?: boolean;
  className?: string;
}

// Table Components
export const Table: React.FC<TableProps> = ({ children, className }) => {
  return (
    <table className={cn("min-w-full", className)}>
      {children}
    </table>
  );
};

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className }) => {
  return <thead className={className}>{children}</thead>;
};

export const TableBody: React.FC<TableBodyProps> = ({ children, className }) => {
  return <tbody className={className}>{children}</tbody>;
};

export const TableRow: React.FC<TableRowProps> = ({ children, className }) => {
  return <tr className={className}>{children}</tr>;
};

export const TableCell: React.FC<TableCellProps> = ({
  children,
  isHeader = false,
  className,
}) => {
  const CellTag = isHeader ? "th" : "td";
  return <CellTag className={cn("", className)}>{children}</CellTag>;
};

// Enhanced Data Table for TenantFlow
interface User {
  image: string;
  name: string;
  email: string;
}

interface DataRow {
  id: number;
  user: User;
  property: string;
  unit?: string;
  status: "active" | "pending" | "cancelled" | "expired";
  amount?: string;
  date?: string;
  priority?: "high" | "medium" | "low";
}

interface TenantFlowDataTableProps {
  data: DataRow[];
  columns: {
    key: keyof DataRow | 'actions';
    title: string;
    render?: (value: unknown, row: DataRow) => React.ReactNode;
  }[];
  className?: string;
}

export const TenantFlowDataTable: React.FC<TenantFlowDataTableProps> = ({
  data,
  columns,
  className,
}) => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      case "expired":
        return "outline";
      default:
        return "default";
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "default";
    }
  };

  const renderCellContent = (column: { key: keyof DataRow | 'actions'; title: string; render?: (value: unknown, row: DataRow) => React.ReactNode }, row: DataRow) => {
    if (column.render) {
      return column.render(row[column.key as keyof DataRow], row);
    }

    switch (column.key) {
      case "user":
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 overflow-hidden rounded-full">
              <Image
                width={40}
                height={40}
                src={row.user.image}
                alt={row.user.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {row.user.name}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {row.user.email}
              </div>
            </div>
          </div>
        );
      
      case "status":
        return (
          <Badge variant={getStatusBadgeVariant(row.status)}>
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </Badge>
        );
      
      case "priority":
        return row.priority ? (
          <Badge variant={getPriorityBadgeVariant(row.priority)}>
            {row.priority.charAt(0).toUpperCase() + row.priority.slice(1)}
          </Badge>
        ) : null;
      
      default: {
        const value = row[column.key as keyof DataRow];
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return value as React.ReactNode;
      }
    }
  };

  return (
    <div className={cn(
      "overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950",
      className
    )}>
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-gray-800">
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  isHeader
                  className="px-6 py-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400"
                >
                  {column.title}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.map((row) => (
              <TableRow 
                key={row.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100"
                  >
                    {renderCellContent(column, row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// Example usage component for TenantFlow properties
export const PropertiesDataTable: React.FC = () => {
  const sampleData: DataRow[] = [
    {
      id: 1,
      user: {
        image: "/images/user/user-01.jpg",
        name: "John Doe",
        email: "john@example.com",
      },
      property: "Sunset Apartments",
      unit: "Unit 101",
      status: "active",
      amount: "$1,200",
      date: "2024-01-15",
    },
    {
      id: 2,
      user: {
        image: "/images/user/user-02.jpg",
        name: "Jane Smith",
        email: "jane@example.com",
      },
      property: "Downtown Lofts",
      unit: "Unit 205",
      status: "pending",
      amount: "$1,500",
      date: "2024-01-14",
    },
  ];

  const columns = [
    { key: 'user' as const, title: 'Tenant' },
    { key: 'property' as const, title: 'Property' },
    { key: 'unit' as const, title: 'Unit' },
    { key: 'status' as const, title: 'Status' },
    { key: 'amount' as const, title: 'Rent' },
    { key: 'date' as const, title: 'Date' },
  ];

  return <TenantFlowDataTable data={sampleData} columns={columns} />;
};

export default TenantFlowDataTable;