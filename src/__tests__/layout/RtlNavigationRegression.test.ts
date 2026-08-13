import fs from 'fs'
import path from 'path'

describe('RTL desktop navigation regression', () => {
  const sourceRoot = path.resolve(__dirname, '../..')

  it('keeps left-edge desktop dropdowns inside the RTL viewport', () => {
    const navbar = fs.readFileSync(
      path.join(sourceRoot, 'shared/components/navbar/Navbar.tsx'),
      'utf8',
    )
    const navigationCss = fs.readFileSync(path.join(sourceRoot, 'runcdx-navigation.css'), 'utf8')

    expect(navbar).not.toContain('alignRight')
    expect(navigationCss).toContain("html[dir='rtl'] .nav-add-new .dropdown-menu")
    expect(navigationCss).toContain("html[dir='rtl'] .nav-account .dropdown-menu")
    expect(navigationCss).toContain('left: 0 !important')
    expect(navigationCss).toContain('right: auto !important')
  })

  it('loads navigation overrides after the base layout stylesheet', () => {
    const entrypoint = fs.readFileSync(path.join(sourceRoot, 'index.tsx'), 'utf8')
    expect(entrypoint.indexOf("import './runcdx-navigation.css'")).toBeGreaterThan(
      entrypoint.indexOf("import './runcdx-layout.css'"),
    )
  })
})
