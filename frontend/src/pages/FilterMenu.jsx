import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/Card";
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/Button';
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from '../components/ui/Select';
import { Label } from '../components/ui/Label';

const defaultFilters = {
  status: '',
  priority: '',
  category: '',
  subject: '',
  user: '',
  device: '',
  startDate: '',
  endDate: '',
};

function FilterMenu({ onFilterChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);

  const handleChange = (name, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  };

    // Suodattimien lähetys
    const applyFilters = () => {
    // Poistetaan tyhjät arvot suodattimista
    const filteredFilters = Object.fromEntries(
      Object.entries(filters).filter(([key, value]) => value && value !== '')
    );
    onFilterChange(filteredFilters);
  };

  // Suodattimien alustus
  const clearFilters = () => {
    setFilters(defaultFilters);
    onFilterChange({});
  };

  // Avaa tai sulje suodatinvalikko
  const toggleFilterMenu = () => setIsOpen(!isOpen);

  return (
    <Card className="w-full mx-auto p-6">
      <CardHeader>
        <CardTitle>Suodatinvalikko</CardTitle>
        <CardDescription>Suodata tikettejä</CardDescription>
        <Button onClick={toggleFilterMenu} className="mt-4 w-full">
          {isOpen ? 'Sulje suodatinvalikko' : 'Avaa suodatinvalikko'}
        </Button>
      </CardHeader>

      {isOpen && (
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Tila:</Label>
              <Select
                id="status-filter"
                value={filters.status}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Valitse tila" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open" className="hover:bg-blue-200">Avoin</SelectItem>
                  <SelectItem value="in_progress" className="hover:bg-blue-200">Käsittelyssä</SelectItem>
                  <SelectItem value="closed" className="hover:bg-blue-200">Suljettu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority-filter">Prioriteetti:</Label>
              <Select
                id="priority-filter"
                value={filters.priority}
                onValueChange={(value) => handleChange("priority", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Valitse prioriteetti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical" className="hover:bg-blue-200">Kriittinen</SelectItem>
                  <SelectItem value="high" className="hover:bg-blue-200">Korkea</SelectItem>
                  <SelectItem value="medium" className="hover:bg-blue-200">Normaali</SelectItem>
                  <SelectItem value="low" className="hover:bg-blue-200">Matala</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
            <Label htmlFor="category-filter">Kategoria:</Label>
            <Select
              id="category-filter"
              value={filters.category}
              onValueChange={(value) => handleChange("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Valitse kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general" className="hover:bg-blue-200">Yleinen</SelectItem>
                <SelectItem value="technical" className="hover:bg-blue-200">Tekninen</SelectItem>
              </SelectContent>
            </Select>
          </div>

            <div className="space-y-2">
              <Label htmlFor="subject-filter">Aihe:</Label>
              <Input
                type="text"
                id="subject-filter"
                name="subject"
                value={filters.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                placeholder="Kirjoita aihe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-filter">Käyttäjä:</Label>
              <Input
                type="text"
                id="user-filter"
                name="user"
                value={filters.user}
                onChange={(e) => handleChange("user", e.target.value)}
                placeholder="Kirjoita käyttäjän nimi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-filter">Laite:</Label>
              <Input
                type="text"
                id="device-filter"
                name="device"
                value={filters.device}
                onChange={(e) => handleChange("device", e.target.value)}
                placeholder="Kirjoita laitteen nimi"
              />
            </div>

            <div className="space-y-2">
              <Label>Päivämäärä</Label>
              <div className="flex space-x-4">
                <div className="flex flex-col">
                  <Label htmlFor="start-date">Alkaen:</Label>
                  <Input
                    type="date"
                    id="start-date"
                    name="startDate"
                    value={filters.startDate}
                    onChange={(e) => handleChange("startDate", e.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="end-date">Päättyen:</Label>
                  <Input
                    type="date"
                    id="end-date"
                    name="endDate"
                    value={filters.endDate}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}

      {isOpen && (
        <CardFooter className="flex justify-between">
          <Button className="w-32 mt-4 bg-red-400 text-white hover:bg-red-500" onClick={clearFilters}> Tyhjennä suodattimet </Button>
          <Button className="w-32 mt-4 bg-blue-500 hover:bg-blue-600 text-white" onClick={applyFilters}> Hae </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default FilterMenu;