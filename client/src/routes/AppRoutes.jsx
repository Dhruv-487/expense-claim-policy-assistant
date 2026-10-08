import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import DashboardPage from '../pages/DashboardPage';
import NewClaimPage from '../pages/NewClaimPage';
import ReviewerDashboardPage from '../pages/ReviewerDashboardPage';
import ReviewerClaimDetailsPage from '../pages/ReviewerClaimDetailsPage';
import MyClaimsPage from '../pages/MyClaimsPage';
import MyClaimDetailsPage from '../pages/MyClaimDetailsPage';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import NotFoundPage from '../pages/NotFoundPage';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="claims/new" element={<NewClaimPage />} />
        <Route
          path="my-claims"
          element={
            <ProtectedRoute>
              <MyClaimsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-claims/:id"
          element={
            <ProtectedRoute>
              <MyClaimDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reviewer"
          element={
            <ProtectedRoute requiredRole="REVIEWER">
              <ReviewerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reviewer/claims/:id"
          element={
            <ProtectedRoute requiredRole="REVIEWER">
              <ReviewerClaimDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route path="login" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
