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
  const [activeTab, setActiveTab] = useState<'pdbId' | 'pdbFile' | 'alphaFold'>('pdbId'); // Added alphaFold tab

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setGraspData(null);
    setP2rankData(null);
    setPdbContent(null);
    setSelectedViz(null);
    setSelectedPocket('All Pockets');
    setLoading(true);

    if (activeTab === 'pdbId' && !pdbId) {
      setError('Please provide a PDB ID.');
      setLoading(false);
      return;
    }
    if (activeTab === 'pdbFile' && !pdbFile) {
      setError('Please upload a PDB file.');
      setLoading(false);
      return;
    }
    if (activeTab === 'alphaFold') {
      // Dummy tab, no submission logic
      setError('AlphaFold Structure tab is not yet implemented.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    if (activeTab === 'pdbId' && pdbId) {
      formData.append('pdb_id', pdbId);
    }
    if (activeTab === 'pdbFile' && pdbFile) {
      formData.append('pdb_file', pdbFile);
    }

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to process the PDB file.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || 'An error occurred while processing the PDB file.';
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
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
      setError(err.message || 'An error occurred while processing the request.');
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

  const handleTabChange = (tab: 'pdbId' | 'pdbFile' | 'alphaFold') => {
    setActiveTab(tab);
    // Clear other inputs when switching tabs
    if (tab === 'pdbId') {
      setPdbFile(null);
    } else if (tab === 'pdbFile') {
      setPdbId('');
    } else if (tab === 'alphaFold') {
      setPdbId('');
      setPdbFile(null);
    }
    setError(null); // Clear any existing errors
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
      return ['All Pockets', 'Pocket 1', 'Pocket 2'];
    } else if (selectedViz === 'P2Rank' && p2rankData) {
      return ['All Pockets', ...p2rankData.map((_, i) => `Pocket ${i + 1}`)];
    }
    return ['All Pockets'];
  };

  const getSelectedPockets = () => {
    let pockets = selectedViz === 'GrASP' ? graspPockets : p2rankPockets;
    if (selectedViz === 'GrASP') {
      pockets = {
        pocket1: graspPockets.pocket1 || [],
        pocket2: graspPockets.pocket2 || [],
      };
      if (!graspPockets.pocket1) console.log('Warning: pocket1 missing in graspPockets');
      if (!graspPockets.pocket2) console.log('Warning: pocket2 missing in graspPockets');
    }

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
      
      <div className="pt-24 min-h-screen bg-gray-50 dark:bg-gray-900 w-full">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 w-full">
          {/* Input Form - Full Width */}
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6 w-4/5 ml-35">
            <form onSubmit={handleSubmit}>
              {/* Tabs Navigation */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                <button
                  type="button"
                  onClick={() => handleTabChange('pdbId')}
                  className={`flex-1 py-2 px-4 text-center font-medium text-sm rounded-t-lg transition-colors duration-200 ${
                    activeTab === 'pdbId'
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-b-2 border-blue-500'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Enter PDB ID
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('pdbFile')}
                  className={`flex-1 py-2 px-4 text-center font-medium text-sm rounded-t-lg transition-colors duration-200 ${
                    activeTab === 'pdbFile'
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-b-2 border-blue-500'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Upload PDB File
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('alphaFold')}
                  className={`flex-1 py-2 px-4 text-center font-medium text-sm rounded-t-lg transition-colors duration-200 ${
                    activeTab === 'alphaFold'
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-b-2 border-blue-500'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  AlphaFold Structure
                </button>
              </div>

              {/* Tab Content */}
              <div className="space-y-5">
                {activeTab === 'pdbId' && (
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
                )}

                {activeTab === 'pdbFile' && (
                  <div>
                    <label htmlFor="pdbFile" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                      Upload a PDB file:
                    </label>
                    <input
                      type="file"
                      id="pdbFile"
                      accept=".pdb"
                      onChange={handleFileChange}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:bg-gray-700 dark:text-gray-200 dark:file:bg-gray-600 dark:file:text-gray-200 dark:hover:file:bg-gray-500"
                      disabled={loading}
                    />
                  </div>
                )}

                {activeTab === 'alphaFold' && (
                  <div>
                    <label htmlFor="alphaFoldId" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                      Enter AlphaFold Structure ID :
                    </label>
                    <input
                      type="text"
                      id="alphaFoldId"
                      placeholder="e.g., AF-Q9Y2H1-F1 "
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-200"
                      disabled={loading}
                      readOnly // Making it read-only since it's a dummy tab
                    />
                   
                  </div>
                )}

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

          {/* Error Message */}
          {error && <p className="text-red-600 dark:text-red-400 text-center mb-4 font-medium">{error}</p>}

          {/* Main Content Layout: Tables on Left, Visualization on Right */}
          {(graspData || p2rankData) && (
            <div className="flex flex-col lg:flex-row lg:space-x-6">
              {/* Left Column: Tables */}
              <div className="lg:w-1/2 flex flex-col space-y-6">
                {/* GrASP Table */}
                {graspData && (
                  <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700">
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

                {/* P2Rank Table */}
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

              {/* Right Column: Visualization */}
              {pdbContent && (
                <div className="lg:w-1/2 mt-6 lg:mt-0">
                  <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700">
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
          )}
        </div>
      </div>
    </>
  );
}