'use client';

import { useEffect, useRef, useState } from 'react';
import * as $3Dmol from '3dmol';

interface PDBVisualizerProps {
  pdbData: string;
  pocketResidues: { [key: string]: number[] };
}

interface Tooltip {
  content: string;
  x: number;
  y: number;
}

const PDBVisualizer: React.FC<PDBVisualizerProps> = ({ pdbData, pocketResidues }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<$3Dmol.GLViewer | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [hoveredAtom, setHoveredAtom] = useState<$3Dmol.AtomSpec | null>(null);
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

        // Collect all pocket residues for hoverable selection
        const allPocketResidues = Object.values(pocketResidues).flat().filter(
          (res): res is number => typeof res === 'number' && !isNaN(res)
        );
        console.log('All pocket residues for hover:', allPocketResidues);

        // Make atoms hoverable to detect residue details
        // Apply to all atoms as a test, then narrow down to pocket residues
        viewer.setHoverable(
          {}, // Test with all atoms first
          true,
          (atom: $3Dmol.AtomSpec) => {
            console.log('Hover in triggered:', {
              residueName: atom.resn,
              residueNumber: atom.resi,
              chain: atom.chain,
              atomDetails: atom,
            });

            setHoveredAtom(atom);
            if (atom && atom.resi && atom.chain && atom.resn) {
              const residueName = atom.resn;
              const residueNumber = atom.resi;
              const chain = atom.chain;
              const pocket = Object.entries(pocketResidues).find(([_, residues]) =>
                residues.includes(residueNumber)
              )?.[0] || 'Unknown';
              const content = `Residue ${residueName}${residueNumber} in chain ${chain} (Pocket ${pocket.replace('pocket', '')})`;
              setTooltip({
                content,
                x: mousePositionRef.current.x,
                y: mousePositionRef.current.y,
              });
            }
          },
          () => {
            console.log('Hover out triggered');
            setHoveredAtom(null);
            setTooltip(null);
          }
        );

        // Highlight each pocket with spheres instead of surfaces for testing
        for (const [pocketKey, residues] of Object.entries(pocketResidues)) {
          const validResidues = residues.filter((res): res is number => typeof res === 'number' && !isNaN(res));

          if (validResidues.length > 0) {
            const index = parseInt(pocketKey.replace('pocket', '')) - 1;
            const color = colors[index % colors.length];

            // Render pockets as spheres instead of surfaces to avoid blocking hover
            viewer.setStyle(
              { resi: validResidues },
              { sphere: { color: color, radius: 1.3 } }
            );

            console.log(`Pocket ${pocketKey} rendered as spheres colored ${color} with residues:`, validResidues);
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

    // Add mousemove listener to track cursor position
    const canvas = viewer.getCanvas();
    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left + 10; // Relative to canvas
      const y = event.clientY - rect.top + 10;
      mousePositionRef.current = { x, y };

      // Update tooltip position if an atom is hovered
      if (hoveredAtom && tooltip) {
        setTooltip({
          ...tooltip,
          x: mousePositionRef.current.x,
          y: mousePositionRef.current.y,
        });
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    // Cleanup function
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
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
      {tooltip && (
        <div
          className="absolute bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm shadow-lg pointer-events-none z-[1000]"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          {tooltip.content}
        </div>
      )}
      <style jsx>{`
        div :global(canvas) {
          width: 100% !important;
          height: 100% !important;
          position: absolute;
          top: 0;
          left: 0;
          cursor: pointer !important;
        }
      `}</style>
    </div>
  );
};

export default PDBVisualizer;