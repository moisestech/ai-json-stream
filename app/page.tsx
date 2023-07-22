'use client';

// Return in your response only a valid JSON object in this shape { "id": "id1", "name": "joe", "location": "new york", "age": 30 }

import Image from 'next/image';
import { useRef, useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import DropDown, { VibeType } from '../components/DropDown';
import Header from '../components/Header';
import { useChat } from 'ai/react';

const RenderNestedObject = ({ data, isNested }: { data: any, isNested?: boolean }) => {
  if (Array.isArray(data)) {
    return (
      <ul className={isNested ? 'pl-4' : ''}>
        {data.map((item, index) => (
          <li key={index}>
            <RenderNestedObject data={item} isNested />
          </li>
        ))}
      </ul>
    );
  }

  if (typeof data === 'object' && data !== null) {
    return (
      <ul className={isNested ? 'pl-4' : ''}>
        {Object.entries(data).map(([key, value], index) => (
          <li key={index}>
            <strong>{key}:</strong> <RenderNestedObject data={value} isNested />
          </li>
        ))}
      </ul>
    );
  }

  return <>{data}</>;
};

export default function Page() {
  const [prompt, setPrompt] = useState<string>('');
  const [story, setStory] = useState('Test');
  const [story2Prompt, setStory2Prompt] = useState<string>('');
  const [generatedJSON, setGeneratedJSON] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const jsonRef = useRef<null | HTMLDivElement>(null);

  const shape = {
    id: `1`,
    sentence: '',
    prompt: '',
    characters: [
      {
        name: ''
      }
    ],
    location: '',
    mood : '',
    camera_angle: '',
  }

  useEffect(() => {
    setStory2Prompt(
      `Generate a an object from the following story. 
      The array of Scene objects should look like this:

      Here are the possible camera angles:
      close-up, medium, long, wide, extreme-close-up, point-of-view, birds-eye-view, low-angle, high-angle, dolly, establishing, extreme-long-shot 

      Here are the possible moods:
      cheerful, melancholic, tense, mysterious, romantic, foreboding, humorous, serene, furious, nostalgic, pensive, euphoric, despairing, suspenseful, inspirational,
      
      The 'scene' object should contain the following properties:
      - 'id': a unique identifier for the scene.
      - 'sentence': a single sentence from the story.
      - 'prompt': a text-to-image prompt for Dalle to create.
      - 'characters': an array of characters present in the sentence.
      - 'location': the location where the sentence is set.
      - 'mood': the mood of the scene. Make sure to always include a mood.
      - 'camera_angle': the camera angle of the scene. Make sure to always include a Camera Angle.

      Now, transform the following story into the described JSON format: ${String(story)}
      Don't add any breaks or newlines in your response.
      Return the response of the story as a JSON object filled out with the story in the shape of ${JSON.stringify(shape)}.`
    )
  }, [prompt])



  const scrollToJSON = () => {
    if (jsonRef.current !== null) {
      jsonRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const { input, handleInputChange, handleSubmit, isLoading, messages } =
    useChat({
      body: {
        prompt: story2Prompt
      },
      onResponse() {
        scrollToJSON();
      },
    });

  const onSubmit = (e: any) => {
    e.preventDefault();
    setStory(input);
    handleSubmit(e);
  };

  const isValidJSON = (str: string) => {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    let messageContent = lastMessage?.role === "assistant" ? lastMessage.content : null;
  
    if (messageContent) {
      const validJSON = isValidJSON(messageContent);
  
      if (validJSON) {
        let parsedJSON = JSON.parse(messageContent);
        setGeneratedJSON(messageContent); // <-- set the generatedJSON state here
        setJsonError(null);
        console.log(validJSON);
        console.log(messageContent);
        console.log(parsedJSON);
        
      } else {
        setGeneratedJSON(null); // <-- reset the generatedJSON state if invalid
        setJsonError('Invalid JSON');
        console.log('invalid JSON')
        console.log(messageContent)
      }
    } else {
      setGeneratedJSON(null); // <-- reset the generatedJSON state if there is no new message
    }
  }, [messages]);

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Header />
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        
        <form className="max-w-xl w-full" onSubmit={onSubmit}>
          <div className="flex mt-10 items-center space-x-3">
            <Image
              src="/1-black.png"
              width={30}
              height={30}
              alt="1 icon"
              className="mb-5 sm:mb-0"
            />
            <p className="text-left font-medium">
              Prompt the AI Model to generate a valid JSON Object
            </p>
          </div>
          <textarea
            value={input}
            onChange={handleInputChange}
            rows={4}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
            placeholder={
              'Generate a valid JSON object in this style: \n{ "id": "id1", "name": "joe", "location": "new york", "age": 30 }'
            }
          />

          {!isLoading && (
            <button
              className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              type="submit"
            >
              Generate JSON &rarr;
            </button>
          )}
          {isLoading && (
            <button
              className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              disabled
            >
              <span className="loading">
                <span style={{ backgroundColor: 'white' }} />
                <span style={{ backgroundColor: 'white' }} />
                <span style={{ backgroundColor: 'white' }} />
              </span>
            </button>
          )}
        </form>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{ duration: 2000 }}
        />
        <hr className="h-px bg-gray-700 border-1 dark:bg-gray-700" />
        <output className="space-y-10 my-10">

        {jsonError && (
            <div className="my-5 p-4 bg-red-100 text-red-700 border border-red-400 rounded">
              <h3 className="font-bold">Error:</h3>
              <p>{jsonError}</p>
              <p>Raw response from model:</p>
              <pre>{generatedJSON}</pre>
            </div>
          )}

          {generatedJSON && (
            <>
              <article>
                <h2
                  className="sm:text-4xl text-3xl font-bold text-slate-900 mx-auto"
                  ref={jsonRef}
                >
                  Your generated JSON
                </h2>
              </article>
              <article className="space-y-8 flex flex-col items-center justify-center max-w-xl mx-auto">
                <div
                  className="bg-white rounded-xl shadow-md p-4 hover:bg-gray-100 transition cursor-copy border"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedJSON);
                    toast('Bio copied to clipboard', {
                      icon: '✂️',
                    });
                  }}
                  key={generatedJSON}
                >
                  <p>{generatedJSON}</p>
                </div>
              </article>
              <article className="space-y-8 flex flex-col items-center justify-center max-w-xl mx-auto">
                <div
                  className="bg-white rounded-xl shadow-md p-4 hover:bg-gray-100 transition cursor-copy border"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedJSON);
                    toast('Bio copied to clipboard', {
                      icon: '✂️',
                    });
                  }}
                  key={generatedJSON}
                >
                  <pre>{JSON.stringify(JSON.parse(generatedJSON), null, 2)}</pre>
                </div>
              </article>
              <article className="space-y-8 flex flex-col items-center justify-center max-w-xl mx-auto">
                <div
                  className="bg-white rounded-xl shadow-md p-4 hover:bg-gray-100 transition cursor-copy border"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedJSON);
                    toast('Bio copied to clipboard', {
                      icon: '✂️',
                    });
                  }}
                  key={generatedJSON}
                >
                  <span className='flex flex-col'>
                  {Object.entries(JSON.parse(generatedJSON)).map(([key, value]: [string, any]) => (
                      <ul key={key} className='flex'>
                        <li>{key}:</li> 
                        <strong>{key}:</strong> <RenderNestedObject data={value} isNested />
                      </ul>
                    ))}
                  </span>
                </div>
              </article>
            </>
          )}
        </output>
      </main>
    </div>
  );
}
