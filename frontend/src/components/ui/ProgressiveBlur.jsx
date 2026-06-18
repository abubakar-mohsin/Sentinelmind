import React from 'react';

/**
 * ProgressiveBlur — renders gradient fade overlays on the left and/or right
 * edges of a relative-positioned container, masking content at the boundaries.
 * Use inside a position:relative wrapper.
 */
function ProgressiveBlur({ width = 160, side = 'both' }) {
  const base = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width,
    pointerEvents: 'none',
    zIndex: 10,
  };

  return (
    <>
      {(side === 'left' || side === 'both') && (
        <div
          style={{
            ...base,
            left: 0,
            background: 'linear-gradient(to right, #0a0e1a 0%, transparent 100%)',
          }}
        />
      )}
      {(side === 'right' || side === 'both') && (
        <div
          style={{
            ...base,
            right: 0,
            background: 'linear-gradient(to left, #0a0e1a 0%, transparent 100%)',
          }}
        />
      )}
    </>
  );
}

export default ProgressiveBlur;
