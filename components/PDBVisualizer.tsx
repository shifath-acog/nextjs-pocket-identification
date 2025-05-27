'use client';

import { useEffect, useRef } from 'react';
import * as $3Dmol from '3dmol';

interface PDBVisualizerProps {
  pdbData: string;
  pocketResidues: { [key: string]: number[] };
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

    // Define a color palette for pockets
    const colors = [
      'blue', 'green', 'red', 'yellow', 'cyan',
      'magenta', 'orange', 'purple', 'pink', 'lime'
    ];

    // Load PDB data and render
    const renderStructure = async () => {
      try {
        viewer.addModel(pdbData, 'pdb');

        // Display the protein structure as a grey cartoon
        viewer.setStyle({}, { cartoon: { color: '#D8D8D8' } });

        // Highlight each pocket with a surface in a different color
        for (const [pocketKey, residues] of Object.entries(pocketResidues)) {
          // Filter out invalid residues
          const validResidues = residues.filter((res): res is number => typeof res === 'number' && !isNaN(res));

          if (validResidues.length > 0) {
            // Assign a color based on the pocket index, cycling through the palette
            const index = parseInt(pocketKey.replace('pocket', '')) - 1; // e.g., pocket1 -> 0, pocket2 -> 1
            const color = colors[index % colors.length];

            // Add a molecular surface for the pocket residues
            await new Promise<void>((resolve) => {
              viewer.addSurface(
                $3Dmol.SurfaceType.MS, // Molecular Surface
                { color: color, opacity: 1.0 },
                { resi: validResidues },
                undefined,
                undefined,
                () => resolve() // Callback to resolve the promise when the surface is added
              );
            });

            console.log(`Pocket ${pocketKey} surface colored ${color} with residues:`, validResidues);
          } else {
            console.log(`No valid residues for pocket ${pocketKey}:`, residues);
          }
        }

        // Zoom to fit the structure
        viewer.zoomTo();
        viewer.render();
      } catch (error) {
        console.error('Error rendering PDB data with 3Dmol:', error);
      }
    };

    renderStructure();

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
      className="w-full md:w-full mx-auto h-[300px] md:h-[500px] border border-gray-300 rounded-md overflow-hidden relative"
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