import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Example } from './Example'

describe('Example', () => {
  it('renders the title', () => {
    render(<Example />)
    expect(screen.getByText('Example Component')).toBeInTheDocument()
  })
})
