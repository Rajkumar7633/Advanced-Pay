'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, User, Mail, Phone, Globe, Save, AlertCircle } from 'lucide-react';
import { merchantsApi } from '@/lib/api';

interface MerchantProfile {
  id: string;
  business_name: string;
  email: string;
  phone: string;
  description: string;
  website?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_country?: string;
  address_postal_code?: string;
  tax_id?: string;
  gst_number?: string;
  industry?: string;
  created_at: string;
  updated_at: string;
}

export default function AccountSettingsPage() {
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    email: '',
    phone: '',
    description: '',
    website: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postal_code: ''
    },
    tax_id: '',
    gst_number: '',
    industry: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError('');
      const res: any = await merchantsApi.getProfile();
      if (res && res.id) {
        setProfile(res);
        setFormData({
          business_name: res.business_name || '',
          email: res.email || '',
          phone: res.phone || '',
          description: res.description || '',
          website: res.website || '',
          address: {
            street: res.address_street || '',
            city: res.address_city || '',
            state: res.address_state || '',
            country: res.address_country || '',
            postal_code: res.address_postal_code || ''
          },
          tax_id: res.tax_id || '',
          gst_number: res.gst_number || '',
          industry: res.industry || ''
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.business_name || !formData.email) {
      setError('Business name and email are required');
      return;
    }

    setIsLoading(true);
    try {
      const res: any = await merchantsApi.updateProfile(formData);
      if (res && res.id) {
        setProfile(res);
        setIsEditing(false);
        setError('');
        alert('Profile updated successfully!');
      } else {
        setError('Save failed: No data returned');
      }
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e.message || 'Failed to update profile';
      setError(errorMsg);
      // Stay in editing mode so they can fix it
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
          <p className="text-muted-foreground">Manage your business information and account details</p>
        </div>
        <Link href="/dashboard/settings" className="text-primary hover:underline">
          ← Back to Settings
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Business Information
              </CardTitle>
              <CardDescription>Update your business details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Business Name *
                  </label>
                  <Input
                    value={formData.business_name}
                    onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                    className="bg-card border-border"
                    placeholder="Enter your business name"
                    disabled={!isEditing}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="bg-card border-border"
                    placeholder="business@example.com"
                    disabled={!isEditing}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Phone
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="bg-card border-border"
                    placeholder="+1 (555) 123-4567"
                    disabled={!isEditing}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Website
                  </label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    className="bg-card border-border"
                    placeholder="https://yourwebsite.com"
                    disabled={!isEditing}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                    Business Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground"
                    rows={4}
                    placeholder="Describe your business and what you sell..."
                    disabled={!isEditing}
                  />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Industry</label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({...formData, industry: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground"
                  disabled={!isEditing}
                >
                  <option value="">Select your industry</option>
                  <option value="retail">Retail</option>
                  <option value="technology">Technology</option>
                  <option value="services">Services</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="education">Education</option>
                  <option value="finance">Finance</option>
                  <option value="other">Other</option>
                </select>
              </div>

            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium text-foreground">Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Street
                  </label>
                  <Input
                    value={formData.address?.street}
                    onChange={(e) => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                    className="bg-card border-border"
                    placeholder="123 Main St"
                    disabled={!isEditing}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    City
                  </label>
                  <Input
                    value={formData.address?.city}
                    onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                    className="bg-card border-border"
                    placeholder="New York"
                    disabled={!isEditing}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    State
                  </label>
                  <Input
                    value={formData.address?.state}
                    onChange={(e) => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                    className="bg-card border-border"
                    placeholder="NY"
                    disabled={!isEditing}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Country
                  </label>
                  <Input
                    value={formData.address?.country}
                    onChange={(e) => setFormData({...formData, address: {...formData.address, country: e.target.value}})}
                    className="bg-card border-border"
                    placeholder="United States"
                    disabled={!isEditing}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Postal Code
                  </label>
                  <Input
                    value={formData.address?.postal_code}
                    onChange={(e) => setFormData({...formData, address: {...formData.address, postal_code: e.target.value}})}
                    className="bg-card border-border"
                    placeholder="10001"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium text-foreground">Tax Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Tax ID
                  </label>
                  <Input
                    value={formData.tax_id}
                    onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                    className="bg-card border-border"
                    placeholder="TX123456789"
                    disabled={!isEditing}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    GST Number
                  </label>
                  <Input
                    value={formData.gst_number}
                    onChange={(e) => setFormData({...formData, gst_number: e.target.value})}
                    className="bg-card border-border"
                    placeholder="12ABCDE1234F1G5"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-4">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} className="bg-primary hover:bg-primary/90">
                <Save className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
