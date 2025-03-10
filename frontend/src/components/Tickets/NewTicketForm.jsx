import React from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createTicket, fetchCategories } from '../../utils/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/TextArea';
import { Slider } from '../ui/Slider';
import { Label } from '../ui/Label';
import { Alert, AlertDescription } from '../ui/Alert';
import { Check, AlertTriangle, InfoIcon, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';

import { Paperclip, X } from 'lucide-react';

export default function NewTicketForm({ onClose }) {
  const [formData, setFormData] = React.useState({
    subject: '',
    device: '',
    description: '',
    additionalInfo: '',
    priority: 2,
    categoryId: '',
    attachment: [],
    contentType: 'text'
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const [error, setError] = React.useState(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
      setFormSubmitted(true);
         setTimeout(() => {
          onClose();
        }, 2000);
    },
    onError: (err) => {
      setError(err.message || 'Tiketin luonti epäonnistui');
      setFormSubmitted(false);
    },
  });

  const [formSubmitted, setFormSubmitted] = React.useState(false);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    setError(null);
  };

  const handleCategoryChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      categoryId: value,
    }));
    setError(null);
  };

  const handlePriorityChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      priority: value[0],
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
  
    setFormData((prev) => {
      const newAttachments = [...(prev.attachment || []), ...files];
      if (newAttachments.length > 5) {
        setError('Voit lähettää enintään 5 liitettä');
        setTimeout(() => {
          setError(null);
        }, 3000);
        return { ...prev, attachment: prev.attachment };
      }
      return { ...prev, attachment: newAttachments };
    });
    e.target.value = null;
  };
  

  const handleContentTypeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      contentType: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.description || !formData.categoryId) {
      setError('Täytä kaikki pakolliset kentät');
      return;
    }
    mutation.mutate(formData);
  };

  const getPriorityInfo = () => {
    switch (formData.priority) {
      case 1:
        return {
          color: 'text-green-600',
          icon: Check,
          text: 'Matala prioriteetti',
        };
      case 2:
        return {
          color: 'text-yellow-600',
          icon: InfoIcon,
          text: 'Normaali prioriteetti',
        };
      case 3:
        return {
          color: 'text-orange-600',
          icon: AlertTriangle,
          text: 'Korkea prioriteetti',
        };
      case 4:
        return {
          color: 'text-red-600',
          icon: AlertTriangle,
          text: 'Kriittinen prioriteetti',
        };
      default:
        return {
          color: 'text-yellow-600',
          icon: InfoIcon,
          text: 'Normaali prioriteetti',
        };
    }
  };

  const priorityInfo = getPriorityInfo();
  const PriorityIcon = priorityInfo.icon;

  if (formSubmitted) {
    return (
      <Alert variant="success">
        Tiketti luotu onnistuneesti!
      </Alert>
    );
  }

  return (
    <div
      id="modal-background"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
        <div
          className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto relative "
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="border-none shadow-none ">
            <CardHeader className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
              <div className="flex justify-between items-center">
              <CardTitle className="text-center w-full">
                  Uusi tiketti
                </CardTitle>

              
              </div>
            
            </CardHeader>
    
            <form onSubmit={handleSubmit}>
            <CardContent>
              {error && (
                <div className="sticky top-0 bg-white z-50">
                  <Alert className="bg-red-50 border-red-200 shadow-md">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <AlertDescription className="text-red-600">
                      {error}
                    </AlertDescription>
                  </Alert>
                </div>
              )}


            <div className="space-y-2">
              <Label htmlFor="subject">Tiketin aihe *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={handleChange('subject')}
                required
                placeholder="Mitä ongelmasi koskee?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategoria *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={handleCategoryChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Valitse kategoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contentType">
                Missä muodossa haluat vastauksen? *
              </Label>
              <Select
                value={formData.contentType}
                onValueChange={handleContentTypeChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Valitse muoto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Teksti</SelectItem>
                  <SelectItem value="image">Kuva</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="device">Laite</Label>
              <Input
                id="device"
                value={formData.device}
                onChange={handleChange('device')}
                placeholder="Laitteen nimi (esim.TEST1234-1)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Ongelman kuvaus *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={handleChange('description')}
                required
                placeholder="Kuvaile ongelmasi mahdollisimman tarkasti"
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalInfo">Lisätiedot</Label>
              <Textarea
                id="additionalInfo"
                value={formData.additionalInfo}
                onChange={handleChange('additionalInfo')}
                placeholder="Syötä mahdolliset lisätiedot"
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-6 mb-6">
            <div className="grid grid-cols-3 items-center w-full">
              <Label className="col-span-1">Prioriteetti</Label>
              <div className="col-span-1 flex justify-center items-center gap-1">
                <PriorityIcon className={`w-4 h-4 ${priorityInfo.color}`} />
                <span className={`text-sm ${priorityInfo.color}`}>
                  {priorityInfo.text}
                </span>
              </div>
              <div className="col-span-1"></div>
            </div>

              <div className="relative pt-6 ">
                <Slider
                  value={[formData.priority]}
                  min={1}
                  max={4}
                  step={1}
                  onValueChange={handlePriorityChange}
                  className="w-full"
                />
                <div className="absolute left-0 right-0 -top-2 flex justify-between text-sm text-gray-500">
                  <span className="text-green-600">Matala</span>
                  <span className="text-yellow-600">Normaali</span>
                  <span className="text-orange-600">Korkea</span>
                  <span className="text-red-600">Kriittinen</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment" className="text-gray-700 font-medium">
              </Label>
              <div>
                <input
                  id="attachment"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="attachment"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition duration-200 shadow-md"
                >
                  <Paperclip size={18} />
                  Lisää liite
                </label>
              </div>
              {formData.attachment.length > 0 && (
                <div className="space-y-1">
                  {formData.attachment.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm text-gray-700 bg-gray-100 p-2 rounded-lg shadow-sm border border-gray-300"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            attachment: prev.attachment.filter((_, i) => i !== index),
                          }))
                        }
                        className="text-gray-500 hover:text-red-500 ml-2 transition duration-200"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="submit"
              disabled={mutation.isPending || categoriesLoading}
              className="w-32 shadow-xl ring-1 ring-gray-300"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Luodaan...
                </>
              ) : (
                'Luo tiketti'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Peruuta
            </Button>
          </CardFooter>
        </form>
      </Card>
      </div>
    </div>
  );
}
