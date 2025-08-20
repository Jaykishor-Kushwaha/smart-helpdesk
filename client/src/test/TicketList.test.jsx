import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import TicketList from '../pages/TicketList'

// Mock the auth store
const mockUser = {
  sub: 'user123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user'
}

vi.mock('../store/auth', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}))

// Mock axios
const mockTickets = [
  {
    _id: 'ticket1',
    title: 'Test Ticket 1',
    description: 'This is a test ticket',
    status: 'open',
    category: 'tech',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'user123'
  },
  {
    _id: 'ticket2',
    title: 'Test Ticket 2',
    description: 'Another test ticket',
    status: 'resolved',
    category: 'billing',
    createdAt: '2024-01-02T00:00:00Z',
    createdBy: 'user123'
  }
]

vi.mock('../api/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const renderTicketList = () => {
  return render(
    <BrowserRouter>
      <TicketList />
    </BrowserRouter>
  )
}

describe('TicketList Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mockHttp = vi.mocked(await import('../api/http')).default
    mockHttp.get.mockResolvedValue({
      data: {
        ok: true,
        data: mockTickets
      }
    })
  })

  test('renders ticket list with header and tickets', async () => {
    renderTicketList()
    
    // Check for header
    expect(screen.getByText('Support Tickets')).toBeInTheDocument()
    expect(screen.getByText('Manage and track support requests')).toBeInTheDocument()
    
    // Check for create ticket button (for users)
    expect(screen.getByText('+ Create Ticket')).toBeInTheDocument()
    
    // Check for filter dropdown
    expect(screen.getByText('Filter by status:')).toBeInTheDocument()
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(screen.getByText('Test Ticket 1')).toBeInTheDocument()
      expect(screen.getByText('Test Ticket 2')).toBeInTheDocument()
    })
  })

  test('filters tickets by status', async () => {
    const user = userEvent.setup()
    const mockHttp = vi.mocked(await import('../api/http')).default
    
    renderTicketList()
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Ticket 1')).toBeInTheDocument()
    })
    
    // Find and click the filter dropdown
    const filterSelect = screen.getByDisplayValue('All Statuses')
    await user.selectOptions(filterSelect, 'open')
    
    // Should make API call with status filter
    await waitFor(() => {
      expect(mockHttp.get).toHaveBeenCalledWith('/tickets', {
        params: { status: 'open' }
      })
    })
  })

  test('opens create ticket modal when button is clicked', async () => {
    const user = userEvent.setup()
    renderTicketList()
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('+ Create Ticket')).toBeInTheDocument()
    })
    
    // Click create ticket button
    const createButton = screen.getByText('+ Create Ticket')
    await user.click(createButton)
    
    // Check if modal opens
    await waitFor(() => {
      expect(screen.getByText('Create New Ticket')).toBeInTheDocument()
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })
  })

  test('creates new ticket successfully', async () => {
    const user = userEvent.setup()
    const mockHttp = vi.mocked(await import('../api/http')).default
    
    // Mock successful ticket creation
    mockHttp.post.mockResolvedValueOnce({
      data: {
        ok: true,
        data: {
          _id: 'new-ticket',
          title: 'New Test Ticket',
          description: 'New ticket description',
          status: 'open',
          category: 'tech'
        }
      }
    })
    
    renderTicketList()
    
    // Open create modal
    const createButton = screen.getByText('+ Create Ticket')
    await user.click(createButton)
    
    // Fill in the form
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    })
    
    const titleInput = screen.getByLabelText(/title/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const submitButton = screen.getByText('Create Ticket')
    
    await user.type(titleInput, 'New Test Ticket')
    await user.type(descriptionInput, 'New ticket description')
    await user.click(submitButton)
    
    // Check API call
    await waitFor(() => {
      expect(mockHttp.post).toHaveBeenCalledWith('/tickets', {
        title: 'New Test Ticket',
        description: 'New ticket description',
        category: 'other'
      })
    })
  })

  test('validates create ticket form', async () => {
    const user = userEvent.setup()
    renderTicketList()
    
    // Open create modal
    const createButton = screen.getByText('+ Create Ticket')
    await user.click(createButton)
    
    await waitFor(() => {
      expect(screen.getByText('Create Ticket')).toBeInTheDocument()
    })
    
    // Try to submit empty form
    const submitButton = screen.getByText('Create Ticket')
    await user.click(submitButton)
    
    // Check for validation (title is required)
    const titleInput = screen.getByLabelText(/title/i)
    expect(titleInput).toBeInvalid()
  })

  test('displays ticket status badges correctly', async () => {
    renderTicketList()
    
    // Wait for tickets to load
    await waitFor(() => {
      expect(screen.getByText('Test Ticket 1')).toBeInTheDocument()
    })
    
    // Check for status badges
    expect(screen.getByText('open')).toBeInTheDocument()
    expect(screen.getByText('resolved')).toBeInTheDocument()
  })

  test('shows empty state when no tickets', async () => {
    const mockHttp = vi.mocked(await import('../api/http')).default
    mockHttp.get.mockResolvedValueOnce({
      data: {
        ok: true,
        data: []
      }
    })
    
    renderTicketList()
    
    await waitFor(() => {
      expect(screen.getByText(/no tickets found/i)).toBeInTheDocument()
    })
  })
})
