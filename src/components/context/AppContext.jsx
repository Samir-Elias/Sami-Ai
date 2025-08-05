import React, { createContext, useContext, useReducer } from 'react';

const AppContext = createContext();

const initialState = {
  messages: [],
  currentProvider: 'gemini',
  currentAgent: 'gemini-1.5-flash',
  apiKey: '',
  showSettings: false,
  isLoading: false,
  currentProject: null
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_PROVIDER':
      return { ...state, currentProvider: action.payload };
    // ... más casos
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};