import { GraspData, P2RankData } from './types';
import Papa from 'papaparse';

export async function parseResponse(response: Response) {
  const boundary = response.headers.get('content-type')?.split('boundary=')[1];
  if (!boundary) throw new Error('No boundary found in response.');

  const text = await response.text();
  const parts = text.split(`--${boundary}`).filter((part) => part.trim() && !part.includes('--'));

  let graspCsv: string | null = null;
  let p2rankCsv: string | null = null;
  let pdbContent: string | null = null;
  let graspPockets: { [key: string]: number[] } = {};
  let p2rankPockets: { [key: string]: number[] } = {};

  for (const part of parts) {
    if (part.includes('grasp.csv')) {
      graspCsv = part.split('\r\n\r\n')[1].split('\r\n--')[0];
    } else if (part.includes('p2rank.csv')) {
      p2rankCsv = part.split('\r\n\r\n')[1].split('\r\n--')[0];
    } else if (part.includes('protein.pdb')) {
      pdbContent = part.split('\r\n\r\n')[1].split('\r\n--')[0];
    }
  }

  const graspData: GraspData[] = [];
  if (graspCsv) {
    try {
      const parsed = Papa.parse(graspCsv, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false, // Keep values as strings
      });
      if (parsed.errors.length > 0) {
        console.warn('PapaParse errors for grasp.csv:', parsed.errors);
      }
      const rows = parsed.data as { [key: string]: string }[];
      console.log('Parsed GrASP rows:', rows); // Debug: Log parsed rows

      rows.forEach((row, i) => {
        const residues = row['resid_id'] || '';
        const matches = residues.match(/Residue (\w+), (\d+)/g) || [];
        const uniqueResidues = Array.from(new Set(matches.map((m) => {
          const [, residue, number] = m.match(/Residue (\w+), (\d+)/)!;
          return `${residue}${number}`;
        }))).sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));
        const numbers = uniqueResidues.map((res) => parseInt(res.match(/\d+/)![0]));
        graspPockets[`pocket${i + 1}`] = numbers;

        let atoms = '';
        try {
          atoms = row['atom_indexes'] ? JSON.parse(row['atom_indexes']).join(', ') : '';
        } catch (e) {
          console.warn(`Failed to parse atom_indexes for GrASP row ${i + 1}:`, row['atom_indexes'], e);
        }

        graspData.push({
          Pockets: `Pocket ${i + 1}`,
          score: parseFloat(row['prob'] || '0'),
          'Pocket center': `(${parseFloat(row['x'] || '0').toFixed(3)}, ${parseFloat(row['y'] || '0').toFixed(3)}, ${parseFloat(row['z'] || '0').toFixed(3)})`,
          Residues: uniqueResidues.join(', '),
          Atoms: atoms,
        });
      });
    } catch (e) {
      console.error('Failed to parse grasp.csv:', e);
    }
  }

  const p2rankData: P2RankData[] = [];
  if (p2rankCsv) {
    const lines = p2rankCsv.split('\n').filter((line) => line.trim());
    const headers = lines[0].split(',').map((h) => h.trim());
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(/(?=(?:(?:[^"]*"){2})*[^"]*$),/);
      if (values.length < headers.length) {
        console.warn(`Skipping P2Rank row ${i}: insufficient values (${values.length} < ${headers.length})`, values);
        continue;
      }
      const row: { [key: string]: string } = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim().replace(/^"|"$/g, '') || '';
      });

      const residues = row['residue_ids']?.split(' ').filter(Boolean) || [];
      const residueDict = parsePdb(pdbContent || '');
      const combinedResidues = combineResidueNameId(residues.join(', '), residueDict);
      const resNumbers = residues.map((res) => parseInt(res.split('_')[1])).filter((n) => !isNaN(n));
      p2rankPockets[`pocket${i}`] = resNumbers;

      p2rankData.push({
        Pockets: row['name']?.replace('pocket', 'Pocket ') || `Pocket ${i}`,
        score: parseFloat(row['probability'] || '0'),
        'Pocket center': `(${parseFloat(row['center_x'] || '0').toFixed(3)}, ${parseFloat(row['center_y'] || '0').toFixed(3)}, ${parseFloat(row['center_z'] || '0').toFixed(3)})`,
        Residues: combinedResidues,
        Atoms: row['surf_atom_ids']?.split(' ').filter(Boolean).join(', ') || '',
      });
    }
    console.log('Parsed P2Rank rows:', p2rankData); // Debug: Log parsed rows
  }

  return { graspData, p2rankData, pdbContent, graspPockets, p2rankPockets };
}

function parsePdb(pdbContent: string): { [key: string]: string } {
  const residueDict: { [key: string]: string } = {};
  const lines = pdbContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
      const chainId = line[21]?.trim() || '';
      const residueName = line.slice(17, 20).trim();
      const residueIndex = line.slice(22, 26).trim();
      const residueKey = `${chainId}_${residueIndex}`;
      residueDict[residueKey] = residueName;
    }
  }
  return residueDict;
}

function combineResidueNameId(residueIds: string, residueDict: { [key: string]: string }): string {
  const combined: string[] = [];
  const residueList = residueIds.split(',').map((id) => id.trim());
  for (const residueId of residueList) {
    if (residueDict[residueId]) {
      const [chain, index] = residueId.split('_');
      const residueName = residueDict[residueId];
      combined.push(`${residueName}${index}`);
    } else {
      combined.push(`Unknown_${residueId}`);
    }
  }
  return combined.join(', ');
}