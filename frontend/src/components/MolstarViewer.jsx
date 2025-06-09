import React, { useEffect, useRef, useState } from 'react';
import { Viewer } from '@rcsb/rcsb-molstar/build/src/viewer';

export default function MolstarViewer({ jobId }) {
  const viewerRef = useRef(null);
  const viewerInstance = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initViewer = async () => {
      if (!viewerRef.current || viewerInstance.current) return;

      try {
        setError(null);
        setIsLoading(true);

        // Create viewer with more constrained settings
        viewerInstance.current = new Viewer(viewerRef.current, {
          layoutIsExpanded: false,
          layoutShowControls: false,
          layoutShowSequence: true,
          layoutShowLog: false,
          layoutShowLeftPanel: false,
          viewportShowExpand: false,
          viewportShowSelectionMode: false,
          viewportShowAnimation: false,
          showQuickStylesControls: true
        });

        if (!mounted) return;

        // Try to load the structure
        await viewerInstance.current.loadStructureFromUrl(`/api/jobs/${jobId}/pdb`, 'pdb', false);
        
        if (mounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading structure:', err);
        if (mounted) {
          setError(`Failed to load structure: ${err.message}`);
          setIsLoading(false);
        }
      }
    };

    initViewer();

    // Cleanup function
    return () => {
      mounted = false;
      if (viewerInstance.current) {
        try {
          viewerInstance.current.clear?.();
        } catch (err) {
          console.warn('Error clearing viewer:', err);
        }
        viewerInstance.current = null;
      }
    };
  }, [jobId]);

  if (error) {
    return (
      <div style={{ width: '100%', height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}>
        <div style={{ color: 'red', textAlign: 'center' }}>
          <p>Error loading molecular structure:</p>
          <p style={{ fontSize: '0.9em' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative', border: '1px solid #ddd' }}>
      {isLoading && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 1000
        }}>
          <p>Loading molecular structure...</p>
        </div>
      )}
      <div 
        ref={viewerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'relative',
          overflow: 'hidden'
        }} 
      />
    </div>
  );
}


