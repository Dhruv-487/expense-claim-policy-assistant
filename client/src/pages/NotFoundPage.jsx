import React from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, Home } from 'lucide-react';
import Card, { CardBody } from '../components/common/Card';
import Button from '../components/common/Button';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Card className="max-w-md w-full text-center p-8">
        <CardBody className="space-y-4">
          <div className="h-16 w-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 mx-auto">
            <AlertOctagon className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">404</h2>
          <p className="text-base font-medium text-slate-200">Page Not Found</p>
          <p className="text-xs text-slate-400">
            The page or resource you requested could not be located on the server.
          </p>
          <div className="pt-4">
            <Link to="/">
              <Button icon={Home}>Return to Dashboard</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default NotFoundPage;
