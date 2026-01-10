/**
 * Footer - Branch and version info at bottom of TUI
 */

import { THEME } from '../theme/colors.js'

interface FooterProps {
  branch?: string
  version?: string
}

export function Footer({ branch = 'master', version = 'v0.1.0' }: FooterProps) {
  return (
    <box
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingLeft: 1,
        paddingRight: 1,
        marginTop: 1,
      }}
    >
      <text style={{ fg: THEME.textMuted }}>
        ~/waxin-agent:{branch}
      </text>
      <text style={{ fg: THEME.textMuted }}>
        {version}
      </text>
    </box>
  )
}
