import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Login from '../pages/Login'

// Mock the auth store
vi.mock('../store/auth', () => ({
  useAuth: () => ({
    setAuth: vi.fn(),
  }),
}))

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock axios
vi.mock('../api/http', () => ({
  default: {
    post: vi.fn(),
  },
}))

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  )
}

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders login form with all required elements', () => {
    renderLogin()
    
    // Check for animated logo
    expect(screen.getByText('Sign in to Smart Helpdesk')).toBeInTheDocument()
    
    // Check for form elements
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    
    // Check for link to register
    expect(screen.getByText(/create a new account/i)).toBeInTheDocument()
    
    // Check for demo accounts section
    expect(screen.getByText(/demo accounts/i)).toBeInTheDocument()
  })

  test('validates form inputs correctly', async () => {
    const user = userEvent.setup()
    renderLogin()
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Test empty form submission
    await user.clear(emailInput)
    await user.clear(passwordInput)
    await user.click(submitButton)
    
    // Should not submit with empty fields (browser validation)
    expect(emailInput).toBeInvalid()
    
    // Test invalid email format
    await user.type(emailInput, 'invalid-email')
    expect(emailInput).toBeInvalid()
    
    // Test valid email format
    await user.clear(emailInput)
    await user.type(emailInput, 'test@example.com')
    expect(emailInput).toBeValid()
    
    // Test password field
    await user.type(passwordInput, 'password123')
    expect(passwordInput).toBeValid()
  })

  test('handles form submission correctly', async () => {
    const user = userEvent.setup()
    const mockHttp = await import('../api/http')
    const mockSetAuth = vi.fn()
    
    // Mock successful login response
    mockHttp.default.post.mockResolvedValueOnce({
      data: {
        data: {
          token: 'mock-jwt-token'
        }
      }
    })
    
    // Mock useAuth hook
    vi.doMock('../store/auth', () => ({
      useAuth: () => ({
        setAuth: mockSetAuth,
      }),
    }))
    
    renderLogin()
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Fill in the form
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    
    // Submit the form
    await user.click(submitButton)
    
    // Wait for the API call
    await waitFor(() => {
      expect(mockHttp.default.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      })
    })
  })

  test('displays error message on login failure', async () => {
    const user = userEvent.setup()
    const mockHttp = await import('../api/http')
    
    // Mock failed login response
    mockHttp.default.post.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            message: 'Invalid credentials'
          }
        }
      }
    })
    
    renderLogin()
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Fill in the form with invalid credentials
    await user.type(emailInput, 'wrong@example.com')
    await user.type(passwordInput, 'wrongpassword')
    
    // Submit the form
    await user.click(submitButton)
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  test('shows loading state during submission', async () => {
    const user = userEvent.setup()
    const mockHttp = await import('../api/http')
    
    // Mock delayed response
    mockHttp.default.post.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        data: { data: { token: 'mock-token' } }
      }), 100))
    )
    
    renderLogin()
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Fill in the form
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    
    // Submit the form
    await user.click(submitButton)
    
    // Check for loading state
    expect(submitButton).toBeDisabled()
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    }, { timeout: 200 })
  })
})
