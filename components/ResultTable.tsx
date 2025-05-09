'use client';

import { GraspData, P2RankData } from '../lib/types';

interface ResultTableProps {
  data: GraspData[] | P2RankData[];
}

const ResultTable: React.FC<ResultTableProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]) as (keyof GraspData)[];

  return (
    <div className="overflow-x-auto mt-4">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="border border-gray-300 p-2 bg-gray-100 text-left text-sm font-semibold text-gray-700 sticky top-0 z-10 whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
            >
              {headers.map((header) => (
                <td
                  key={header}
                  className="border border-gray-300 p-2 text-sm text-gray-900 whitespace-nowrap"
                >
                  {row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultTable;