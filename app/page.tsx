'use client';

import { useState, FormEvent } from 'react';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import ResultTable from '../components/ResultTable';
import { GraspData, P2RankData } from '../lib/types';

// Dynamically import PDBVisualizer with SSR disabled
const PDBVisualizer = dynamic(() => import('../components/PDBVisualizer'), {
  ssr: false,
});

export default function Home() {
  const [pdbId, setPdbId] = useState<string>('');
  const [pdbFile, setPdbFile] = useState<File | null>(null);
  const [graspData, setGraspData] = useState<GraspData[] | null>(null);
  const [p2rankData, setP2rankData] = useState<P2RankData[] | null>(null);
  const [pdbContent, setPdbContent] = useState<string | null>(null);
  const [graspPockets, setGraspPockets] = useState<{ [key: string]: number[] }>({});
  const [p2rankPockets, setP2rankPockets] = useState<{ [key: string]: number[] }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedViz, setSelectedViz] = useState<'GrASP' | 'P2Rank' | null>(null);
  const [selectedPocket, setSelectedPocket] = useState<string>('All Pockets');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setGraspData(null);
    setP2rankData(null);
    setPdbContent(null);
    setSelectedViz(null);
    setSelectedPocket('All Pockets');
    setLoading(true);

    if (!pdbId && !pdbFile) {
      setError('Please provide either a PDB ID or upload a PDB file.');
      setLoading(false);
      return;
    }
    if (pdbId && pdbFile) {
      setError('Please provide only one: either a PDB ID or a PDB file, not both.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    if (pdbId) {
      formData.append('pdb_id', pdbId);
    }
    if (pdbFile) {
      formData.append('pdb_file', pdbFile);
    }

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process the PDB file.');
      }
      console.log('response:', response);

      const data = await response.json();
      setGraspData(data.graspData);
      console.log('graspData=', data.graspData);
      setP2rankData(data.p2rankData);
      console.log('p2rankData=', data.p2rankData);
      setPdbContent(data.pdbContent);
      console.log('pdbContent=', data.pdbContent?.substring(0, 100) + (data.pdbContent?.length > 100 ? '...' : ''));
      setGraspPockets(data.graspPockets || {});
      console.log('graspPockets=', data.graspPockets);
      setP2rankPockets(data.p2rankPockets || {});
      console.log('p2rankPockets=', data.p2rankPockets);
      if (data.graspData && data.graspData.length > 0) {
        setSelectedViz('GrASP');
      } else if (data.p2rankData && data.p2rankData.length > 0) {
        setSelectedViz('P2Rank');
      }
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdbFile(e.target.files[0]);
    } else {
      setPdbFile(null);
    }
  };

  const downloadCSV = (data: GraspData[] | P2RankData[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]) as (keyof GraspData)[];
    
    const escapeCsvValue = (value: string) => {
      if (typeof value !== 'string') return value;
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((header) => escapeCsvValue(String(row[header]))).join(',')
      ),
    ];
    const csvContent = csvRows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const pocketOptions = () => {
    if (selectedViz === 'GrASP' && graspData) {
      return ['All Pockets', ...graspData.map((_, i) => `Pocket ${i + 1}`)];
    } else if (selectedViz === 'P2Rank' && p2rankData) {
      return ['All Pockets', ...p2rankData.map((_, i) => `Pocket ${i + 1}`)];
    }
    return ['All Pockets'];
  };

  const getSelectedPockets = () => {
    const pockets = selectedViz === 'GrASP' ? graspPockets : p2rankPockets;
    if (selectedPocket === 'All Pockets') {
      console.log('All pockets for', selectedViz, ':', pockets);
      return pockets;
    }
    const pocketNumber = parseInt(selectedPocket.split(' ')[1]);
    const pocketKey = `pocket${pocketNumber}`;
    const selectedPockets = { [pocketKey]: pockets[pocketKey] || [] };
    console.log(`Selected pocket ${selectedViz} ${pocketKey}:`, selectedPockets);
    return selectedPockets;
  };

  return (
    <>
      <Header />
      <div className="container mx-auto pt-24 sm:pt-28 p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 mt-20">
        {/* Row 1: Form and Tables */}
        <div className="flex flex-col md:flex-row md:space-x-6 mb-10">
          {/* Input Form Column */}
          <div className="md:w-1/3 mb-6 md:mb-0">
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <form onSubmit={handleSubmit}>
                <div className="space-y-5">
                  <div>
                    <label htmlFor="pdbId" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                      Enter PDB ID of Protein:
                    </label>
                    <input
                      type="text"
                      id="pdbId"
                      value={pdbId}
                      onChange={(e) => setPdbId(e.target.value)}
                      placeholder="4NR5 or 4HMN or 1CLJ"
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-200"
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-1/3 h-px bg-gray-300 dark:bg-gray-600"></div>
                    <span className="px-4 text-gray-500 dark:text-gray-400 font-medium">OR</span>
                    <div className="w-1/3 h-px bg-gray-300 dark:bg-gray-600"></div>
                  </div>

                  <div>
                    <label htmlFor="pdbFile" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                      Upload a PDB file:
                    </label>
                    <input
                      type="file"
                      id="pdbFile"
                      accept=".pdb"
                      onChange={handleFileChange}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-3 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:bg-gray-700 dark:text-gray-200 dark:file:bg-gray-600 dark:file:text-gray-200 dark:hover:file:bg-gray-500"
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gray-900 text-white font-semibold py-3 px-4 rounded-md hover:bg-gray-800 disabled:bg-gray-500 transition-colors duration-200"
                  >
                    {loading ? 'Processing...' : 'Process'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Tables Column */}
          <div className="md:w-2/3 flex-1">
            {error && <p className="text-red-600 dark:text-red-400 text-center mb-4 font-medium">{error}</p>}

            {graspData && (
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">Pockets identified by GrASP</h2>
                    <div className="relative group">
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 rounded-full cursor-pointer">
                        i
                      </span>
                      <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-96 p-2 text-sm text-gray-100 bg-gray-800 dark:bg-gray-200 dark:text-gray-900 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        GRaSP is a method for identifying druggable binding sites using graph neural networks with attention [J. Chem. Inf. Model. 2024, 64, 7, 2637–2644]
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadCSV(graspData.slice(0, 2), 'grasp_pockets.csv')}
                    className="bg-gray-900 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-800 transition-colors duration-200"
                  >
                    Download as CSV
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[400px]">
                  <ResultTable data={graspData.slice(0, 2)} />
                </div>
              </div>
            )}

            {p2rankData && (
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">Pockets identified by P2Rank</h2>
                    <div className="relative group">
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 rounded-full cursor-pointer">
                        i
                      </span>
                      <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-96 p-2 text-sm text-gray-100 bg-gray-800 dark:bg-gray-200 dark:text-gray-900 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        P2Rank a machine learning-based method for prediction of ligand binding sites from protein structure [J Cheminform. 2018, 10, 39]
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadCSV(p2rankData, 'p2rank_pockets.csv')}
                    className="bg-gray-900 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-800 transition-colors duration-200"
                  >
                    Download as CSV
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[400px]">
                  <ResultTable data={p2rankData} />
                </div>
              </div>
            )}
          </div>

            </div>

        {/* Row 2: Visualization with Dropdowns */}
        {(graspData || p2rankData) && pdbContent && (
          <div className="flex-1 flex flex-col items-center mb-10">
            <div className="w-full md:w-2/3 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
                <div>
                  <label htmlFor="vizSelect" className="mr-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                    Select Visualization:
                  </label>
                  <select
                    id="vizSelect"
                    value={selectedViz || ''}
                    onChange={(e) => {
                      setSelectedViz(e.target.value as 'GrASP' | 'P2Rank');
                      setSelectedPocket('All Pockets');
                    }}
                    className="border border-gray-300 dark:border-gray-600 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <option value="" disabled>
                      Select a visualization
                    </option>
                    {graspData && graspData.length > 0 && <option value="GrASP">GrASP</option>}
                    {p2rankData && p2rankData.length > 0 && <option value="P2Rank">P2Rank</option>}
                  </select>
                </div>

                {selectedViz && (
                  <div>
                    <label htmlFor="pocketSelect" className="mr-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                      Select Pocket:
                    </label>
                    <select
                      id="pocketSelect"
                      value={selectedPocket}
                      onChange={(e) => setSelectedPocket(e.target.value)}
                      className="border border-gray-300 dark:border-gray-600 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-200"
                    >
                      {pocketOptions().map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {selectedViz && (
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">
                    3D Structure Visualization for {selectedViz} - {selectedPocket}
                  </h2>
                  <PDBVisualizer
                    pdbData={pdbContent}
                    pocketResidues={getSelectedPockets()}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}