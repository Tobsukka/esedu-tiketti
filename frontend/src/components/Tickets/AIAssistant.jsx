import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/TextArea';
import { Spinner } from '../ui/spinner';
import { Checkbox } from '../ui/Checkbox';
import { 
  Sparkles, 
  Copy, 
  Check, 
  MessageSquare, 
  Search, 
  FileText, 
  ArrowRight, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  Lightbulb,
  HelpCircle
} from 'lucide-react';
import axios from 'axios';

/**
 * Enterprise-grade AI Support Assistant component
 * 
 * Provides professional AI assistance to help support staff resolve tickets
 * with sophisticated analysis, similar ticket detection, and response suggestions.
 */
const AIAssistant = ({ ticket }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedSection, setSelectedSection] = useState('response');
  const [expanded, setExpanded] = useState(true);
  const [includeComments, setIncludeComments] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    // Auto-resize textarea based on content
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [query]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      setResult(null); // Clear any previous results
      
      console.log('Lähetetään kysely tekoälyavustajalle:', query);
      console.log('Tiketin tiedot:', {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description?.substring(0, 30) + '...',
        category: ticket.category?.name,
        includeComments
      });
      
      // Call the AI support agent API
      const response = await axios.post('/api/ai/support-agent', {
        query,
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        ticketCategory: ticket.category?.name,
        ticketPriority: ticket.priority,
        ticketStatus: ticket.status,
        includeComments
      });
      
      const data = response.data;
      console.log('Tekoälyavustajan vastaus:', data);
      
      // Check if the result contains an error from the agent
      if (data.error) {
        console.warn('Tekoälyagentti palautti virheen:', data.error);
        setError(`Tekoälyavustaja kohtasi ongelman: ${data.error}`);
        
        // We still set the result because we may have partial information
        setResult(data);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error('Virhe tekoälyavustajan käytössä:', err);
      setError(err.response?.data?.error || 'Tekoälyavustusta ei saatu. Yritä uudelleen.');
    } finally {
      setLoading(false);
    }
  };

  // Copy suggested response to clipboard
  const copyToClipboard = () => {
    if (result?.suggestedResponse) {
      navigator.clipboard.writeText(result.suggestedResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Suggestion prompts for the user
  const suggestionPrompts = [
    { text: "Analysoi tämä ongelma", icon: <Search className="h-3 w-3" /> },
    { text: "Ehdota vastausta", icon: <MessageSquare className="h-3 w-3" /> },
    { text: "Mikä voisi aiheuttaa tämän?", icon: <Lightbulb className="h-3 w-3" /> },
    { text: "Miten vianetsintä tehdään?", icon: <FileText className="h-3 w-3" /> },
    { text: "Etsi samankaltaiset tiketit", icon: <ArrowRight className="h-3 w-3" /> }
  ];

  // Toggle assistant panel expansion
  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  // Section tabs
  const sections = [
    { id: 'response', label: 'Vastaus', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'analysis', label: 'Analyysi', icon: <Search className="h-4 w-4" />, 
      visible: !!result?.analysisResult },
    { id: 'knowledge', label: 'Tietämys', icon: <FileText className="h-4 w-4" />, 
      visible: result?.relevantKnowledge?.length > 0 }
  ];

  // Get visible tabs
  const visibleSections = sections.filter(section => 
    section.id === 'response' || section.visible !== false
  );

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden transition-all duration-200 mb-6">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-900 border-b border-gray-200 dark:border-gray-800 cursor-pointer"
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-md">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Tekoälyavustaja</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Saa tekoälyavustusta tikettien tehokkaampaan ratkaisuun
            </p>
          </div>
        </div>
        <button 
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
          aria-label={expanded ? "Sulje paneeli" : "Avaa paneeli"}
        >
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {/* Collapsible content */}
      {expanded && (
        <>
          {/* Query input area */}
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Suggestion buttons */}
              <div className="flex flex-wrap gap-2">
                {suggestionPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setQuery(prompt.text)}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <span className="mr-1.5 text-blue-600 dark:text-blue-400">{prompt.icon}</span>
                    {prompt.text}
                  </button>
                ))}
              </div>
              
              {/* Comment inclusion checkbox */}
              <div className="flex items-center gap-2 mb-2">
                <Checkbox 
                  id="include-comments" 
                  checked={includeComments}
                  onCheckedChange={setIncludeComments}
                />
                <label 
                  htmlFor="include-comments" 
                  className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                >
                  Sisällytä tiketin kommenttihistoria analyysiin
                </label>
              </div>
              
              {/* Input field and submit button */}
              <div className="relative flex items-center">
                <Textarea
                  ref={textareaRef}
                  placeholder="Kysy apua tähän tikettiin..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pr-12 resize-none text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500/20 dark:focus:border-blue-600 dark:focus:ring-blue-600/20 transition-all"
                  rows={1}
                />
                <Button 
                  type="submit" 
                  disabled={loading || !query.trim()}
                  className="absolute right-2 rounded-full w-8 h-8 p-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white border-0"
                  aria-label="Lähetä kysely"
                >
                  {loading ? 
                    <Spinner className="h-4 w-4" /> : 
                    <Send className="h-4 w-4" />
                  }
                </Button>
              </div>
            </form>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4">
                  <Spinner className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Käsitellään pyyntöäsi</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                  Analysoidaan tikettiä ja luodaan oivalluksia...
                </p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && !loading && (
            <div className="p-6">
              <div className="flex items-start gap-3 p-4 text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-sm">Virhe tapahtui</h3>
                  <p className="text-sm mt-1 text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="p-0">
              {/* Section tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-800 px-6">
                {visibleSections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      selectedSection === section.id
                        ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                        : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <span className={selectedSection === section.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}>
                      {section.icon}
                    </span>
                    {section.label}
                  </button>
                ))}
              </div>

              {/* Response section */}
              {selectedSection === 'response' && result.suggestedResponse && (
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Ehdotettu vastaus
                    </h3>
                    <Button 
                      onClick={copyToClipboard}
                      variant="ghost" 
                      size="sm"
                      className="h-8 text-xs rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    >
                      {copied ? (
                        <><Check className="h-3.5 w-3.5 mr-1.5 text-green-500" /> <span className="text-gray-900 dark:text-white">Kopioitu</span></>
                      ) : (
                        <><Copy className="h-3.5 w-3.5 mr-1.5" /> <span className="text-gray-900 dark:text-white">Kopioi</span></>
                      )}
                    </Button>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                    <div className="prose prose-sm max-w-none dark:prose-invert text-gray-900 dark:text-white whitespace-pre-wrap">
                      {result.suggestedResponse}
                    </div>
                  </div>

                  {/* Next steps */}
                  {result.nextSteps && result.nextSteps.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <ArrowRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Suositellut toimenpiteet
                      </h3>
                      <ul className="space-y-2">
                        {result.nextSteps.map((step, i) => (
                          <li key={i} className="flex items-start">
                            <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-800/30 text-emerald-700 dark:text-emerald-300 mr-3 mt-0.5 text-xs font-medium">
                              {i + 1}
                            </div>
                            <span className="text-sm text-gray-900 dark:text-white">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Analysis section */}
              {selectedSection === 'analysis' && result.analysisResult && (
                <div className="p-6">
                  <div className="space-y-6">
                    {/* Problem overview */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        Ongelman yleiskatsaus
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                          <div className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Kategoria</div>
                          <div className="font-medium text-sm text-gray-900 dark:text-white">{result.analysisResult.problemCategory}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                          <div className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Monimutkaisuus</div>
                          <div className="font-medium text-sm text-gray-900 dark:text-white">{result.analysisResult.problemComplexity}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                          <div className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Arvioitu ratkaisuaika</div>
                          <div className="font-medium text-sm text-gray-900 dark:text-white">{result.analysisResult.estimatedTimeToResolve}</div>
                        </div>
                      </div>
                    </div>

                    {/* Key insights */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        Keskeiset havainnot
                      </h3>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                        <ul className="space-y-2">
                          {result.analysisResult.keyInsights.map((insight, i) => (
                            <li key={i} className="flex items-start">
                              <div className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center text-amber-700 dark:text-amber-300 flex-shrink-0 mr-3 mt-0.5">
                                <span className="text-xs font-medium">{i+1}</span>
                              </div>
                              <span className="text-sm text-gray-900 dark:text-white">{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Missing Information - Tarvittavat lisätiedot */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        Tarvittavat lisätiedot
                      </h3>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                        <ul className="space-y-2">
                          {result.analysisResult.missingInformation.map((info, i) => (
                            <li key={i} className="flex items-start">
                              <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center text-blue-700 dark:text-blue-300 flex-shrink-0 mr-3 mt-0.5">
                                <span className="text-xs font-medium">?</span>
                              </div>
                              <span className="text-sm text-gray-900 dark:text-white">{info}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Possible causes and approach */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          Mahdolliset syyt
                        </h3>
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                          <ul className="space-y-2">
                            {result.analysisResult.possibleCauses.map((cause, i) => (
                              <li key={i} className="flex items-start">
                                <div className="h-2 w-2 rounded-full bg-orange-400 flex-shrink-0 mr-2 mt-1.5"></div>
                                <span className="text-sm text-gray-900 dark:text-white">{cause}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                          <ArrowRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          Suositeltu lähestymistapa
                        </h3>
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                          <p className="text-sm text-gray-900 dark:text-white">{result.analysisResult.recommendedApproach}</p>
                          
                          {result.analysisResult.potentialSolutions && result.analysisResult.potentialSolutions.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">Mahdolliset ratkaisut</div>
                              <ul className="space-y-1">
                                {result.analysisResult.potentialSolutions.map((solution, i) => (
                                  <li key={i} className="text-sm text-gray-900 dark:text-white flex items-center">
                                    <div className="mr-2 text-emerald-600 dark:text-emerald-400">•</div>
                                    {solution}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Knowledge section */}
              {selectedSection === 'knowledge' && result.relevantKnowledge && result.relevantKnowledge.length > 0 && (
                <div className="p-6">
                  <div className="space-y-6">
                    {/* Similar tickets */}
                    {result.relevantTickets && result.relevantTickets.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                          <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          Samankaltaiset tiketit
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {result.relevantTickets.map((ticket, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-medium text-sm text-gray-900 dark:text-white">{ticket.title}</div>
                                <div className="px-2 py-1 text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full">
                                  {Math.round(ticket.similarity * 100)}% vastaavuus
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">ID: {ticket.id}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Knowledge base */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        Oleellinen tieto
                      </h3>
                      <div className="space-y-3">
                        {result.relevantKnowledge.map((item, i) => (
                          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                            <div className="flex items-start">
                              <div className="bg-blue-100 dark:bg-blue-900/30 p-1 rounded-md mr-3 flex-shrink-0 mt-0.5">
                                <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="text-sm text-gray-900 dark:text-white">{item}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!result && !loading && !error && (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4">
                  <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Tekoälyavustaja valmis</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                  Kysy apua tähän tikettiin yllä olevan kentän avulla.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AIAssistant; 