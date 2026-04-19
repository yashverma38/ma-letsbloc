import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ffb347 0%, #c85028 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 700,
          color: '#fff',
          fontFamily: 'system-ui',
        }}
      >
        मा
      </div>
    ),
    { ...size },
  );
}
