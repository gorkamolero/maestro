import { View } from '@/components/View';
import { PortalWindow } from '@/components/PortalWindow';

interface TestPortalProps {
  onClose: () => void;
}

export function TestPortal({ onClose }: TestPortalProps) {
  console.log('[TestPortal] Rendering test portal');

  return (
    <View style={{
      width: '100%',
      height: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <View style={{ width: 200, height: 200 }}>
        <PortalWindow onClose={onClose}>
          <div
            id="test-portal-red-square"
            data-testid="test-portal"
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: 'red',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold'
            }}
          >
            RED SQUARE
          </div>
        </PortalWindow>
      </View>
    </View>
  );
}
