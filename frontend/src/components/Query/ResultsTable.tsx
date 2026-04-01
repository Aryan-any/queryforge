import { useState } from 'react';
import type { QueryResult } from '../../utils/types';

interface ResultsTableProps {
  result: QueryResult;
}

export default function ResultsTable({ result }: ResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  const isNumber = (val: unknown) =>
    typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '');

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return 'NULL';
    if (val instanceof Date) return val.toLocaleDateString();
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const totalPages = Math.ceil((result.rows?.length || 0) / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = (result.rows || []).slice(startIndex, startIndex + rowsPerPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
      <div className="data-table-container" style={{ maxHeight: '450px', overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {result.columns.map((col, i) => (
                <th key={i}>{col.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, rowIdx) => (
              <tr key={startIndex + rowIdx}>
                {result.columns.map((col, colIdx) => {
                  const val = row[col.name];
                  const isNull = val === null || val === undefined;
                  return (
                    <td
                      key={colIdx}
                      className={isNull ? 'cell-null' : isNumber(val) ? 'cell-number' : ''}
                    >
                      {formatValue(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, result.rows.length)} of {result.rows.length} rows
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
