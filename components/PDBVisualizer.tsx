'use client';

import { useEffect, useRef } from 'react';
import * as $3Dmol from '3dmol';

interface PDBVisualizerProps {
  pdbData: string;
  pocketResidues: { [key: string]: number[] } | number[];
}

const PDBVisualizer: React.FC<PDBVisualizerProps> = ({ pdbData, pocketResidues }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!pdbData || typeof pdbData !== 'string' || pdbData.trim() === '') {
      console.error('Invalid PDB data:', pdbData);
      return;
    }

    // Get container dimensions
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Initialize 3Dmol viewer with explicit dimensions
    const viewer = $3Dmol.createViewer(container, {
      backgroundColor: 'white',
      width: width,
      height: height,
    });
    viewerRef.current = viewer;

    // Load PDB data
    try {
      viewer.addModel(pdbData, 'pdb');

      // Display the protein structure as a grey cartoon
      viewer.setStyle({}, { cartoon: { color: 'grey' } });

      // Normalize pocketResidues to an array and filter out invalid values
      const residues = Array.isArray(pocketResidues)
        ? pocketResidues
        : Object.values(pocketResidues).flat();
      const validResidues = residues.filter((res): res is number => typeof res === 'number' && !isNaN(res));

      // Highlight pocket residues as red spheres
      if (validResidues.length > 0) {
        viewer.setStyle(
          { resi: validResidues },
          { sphere: { color: 'red', radius: 1.0 } }
        );
      } else {
        console.log('No valid residues to highlight:', residues);
      }

      // Zoom to fit the structure
      viewer.zoomTo();
      viewer.render();
    } catch (error) {
      console.error('Error rendering PDB data with 3Dmol:', error);
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.clear();
        viewerRef.current = null;
      }
    };
  }, [pdbData, pocketResidues]);

  return (
    <div
      ref={containerRef}
      className="w-full md:w-2/3 mx-auto h-[400px] md:h-[500px] border border-gray-300 rounded-md overflow-hidden relative"
      style={{ contain: 'strict' }}
    >
      <style jsx>{`
        div :global(canvas) {
          width: 100% !important;
          height: 100% !important;
          position: absolute;
          top: 0;
          left: 0;
        }
      `}</style>
    </div>
  );
};

export default PDBVisualizer;
