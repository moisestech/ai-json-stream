"use client"

import type { NextPage } from "next";
import type { SliderMarks } from 'antd/es/slider';

import Head from "next/head";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { Toaster, toast } from "react-hot-toast";
import axios from 'axios';

import DropDown, { VibeType } from "../components/DropDown";
import Header from "../components/Header";
import { FiDownload } from "react-icons/fi";
import LoadingDots from "../components/LoadingDots";
import { Slider, message, Col, Typography } from "antd";
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";
const { Text } = Typography;

type SceneImage = {
  id: string
  url: string
}

type Character = {
	charId: string
	name: string
	gender: string
	race: string
	skinTone: string
	eyeColor: string
	hair: string
	build: string
	userInput: string
}

type Scene = {
	id: string
	sentence: string
	prompt: string
	characters: Character[]
	location: string
	mood: string
	image: SceneImage[]
}

const Home: NextPage = () => {
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState("");
  const [vibe, setVibe] = useState<VibeType>("Professional");
  const [generatedScene, setGeneratedScene] = useState<Scene[]>([]);
  const [generatedLore, setGeneratedLore] = useState<string>("");
  const [loreFile, setLoreFile] = useState([]);
  const [sceneCount, setSceneCount] = useState(0);
  const [sentencesCount, setSentencesCount] = useState(0);

  const loreRef = useRef<null | HTMLDivElement>(null);

  const scrollToLore = () => {
    if (loreRef.current !== null) {
      loreRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }

  function generateSceneObj(sceneCount: number, sentencesCount: number): Record<number, string> {
    let result: Record<number, string> = {};

    for (let i = sceneCount; i <= sentencesCount; i += sceneCount) {
        result[i] = `${i} Images`;
    }

    return result;
  }

  const marks: SliderMarks = generateSceneObj(sceneCount, sentencesCount);

  const downloadLoreAsJSON = () => {
    try {  
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(generatedLore)
        const downloadAnchorNode = document.createElement('a')
        downloadAnchorNode.setAttribute("href",     dataStr)
        downloadAnchorNode.setAttribute("download", "lore.json")
        document.body.appendChild(downloadAnchorNode) // required for firefox
        downloadAnchorNode.click()
        downloadAnchorNode.remove()
    } catch (e) {
      console.error("Generated Lore is not a valid JSON:", e)
    }
  }

  interface ChunkType {
    text: string;
  }

  function JSONTryParse(input: string): object | false {
    try {
      //check if the string exists
      if (input) {
        var o = JSON.parse(input);
  
        //validate the result too
        if (o && typeof o === "object") {
          return o;
        }
      }
    } catch (e) {}
  
    return false;
  }

  const segmentStory = async () => {
    try {
      await axios.post('/api/segment_paragraphs', { text: story });
      message.success('Story segmented successfully');
    } catch (error) {
      message.error('Failed to segment story');
      console.error(error);
    }
  };

  const generateLore = async (e: any) => {
    e.preventDefault();
    setGeneratedLore("");
    setLoading(true);

    const sentences = story.split('. ');

    console.log(`Sentences to process: ${sentences.length}`); // log the total sentences

    const generatedScenes = [];

    let currentScene = {};

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceID = i + 1; // IDs start from 1
      console.log(`Processing sentence: ${sentence} with ID: ${sentenceID}`); // log the current sentence and its ID

      const shape = {
        id: `${sentenceID}`,
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

      const story2Prompt = 
        `Generate a an object from the following sentence. 
        The array of Scene objects should look like this:
  
        Here are the possible camera angles:
        close-up, medium, long, wide, extreme-close-up, point-of-view, birds-eye-view, low-angle, high-angle, dolly, establishing, extreme-long-shot 

        Here are the possible moods:
        cheerful, melancholic, tense, mysterious, romantic, foreboding, humorous, serene, furious, nostalgic, pensive, euphoric, despairing, suspenseful, inspirational,
        
        The 'scene' object should contain the following properties:
        - 'id': a unique identifier, ${sentenceID}
        - 'sentence': a single sentence from the story.
        - 'prompt': a text-to-image prompt for Dalle to create.
        - 'characters': an array of characters present in the sentence.
        - 'location': the location where the sentence is set.
        - 'mood': the mood of the scene. Make sure to always include a mood.
        - 'camera_angle': the camera angle of the scene. Make sure to always include a Camera Angle.

        Now, transform the following sentence into the described JSON format: ${String(sentence)}
        Don't add any breaks or newlines in your response.
        Return the response as a JSON object with a shape of ${JSON.stringify(shape)}.`

      // Format the sentence
      console.log(`About to send request to /api/generate with story2Prompt: ${story2Prompt}`);
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: story2Prompt,
        }),
      });

      if (!response.ok) {
        console.error(`Response status: ${response.status}`);
        const body = await response.text(); // Or response.json(), depending on the expected format.
        console.error(`Response body: ${body}`);
        throw new Error(`Server error - status: ${response.status}, text: ${response.statusText}, body: ${body}`);
      }
      
      // This data is a ReadableStream
      const data = response.body;
      if (!data) {
        console.log("No data returned for this sentence."); // log when there's no data
        continue;
      }

      const reader = data.getReader();
      const decoder = new TextDecoder();
      // const parser = createParser(onParse);
      let done = false;
      let buffer = '';  // Initialize the data stream text buffer

      // Delay to let the state update with the newly generated scene
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);

        console.log({ chunkValue });

        // const jsonChunkValue = chunkValue.split('\n\n');
        const jsonChunkValue = chunkValue.split('\n');

        jsonChunkValue.forEach(jsonChunk => {
          // Try to parse each jsonChunk
          if (jsonChunk && jsonChunk.trim() !== '') {
            // console.log({ jsonChunk });
            // jsonChunk = jsonChunk.trim().substring(6);  // Remove 'data: ' prefix
            jsonChunk = jsonChunk.replace(/^data: /, '').trim();  // Remove 'data: ' prefix
            // console.log({ jsonChunk });

            let parsedChunk = JSONTryParse(jsonChunk);
            if (parsedChunk !== false) {
                // Here, instead of trying to parse the JSON, we just append it to the buffer
                if (typeof parsedChunk === 'string') {
                    buffer += parsedChunk;
                } else if (typeof parsedChunk === 'object' && 'text' in parsedChunk) {
                    buffer += parsedChunk.text;
                }
            } else {
                console.error(`Invalid JSON chunk: ${jsonChunk}`);
            }
          }
        });
      }

      // Check if the first character of the buffer is an opening bracket
      console.log({ buffer });

      if (buffer.length > 0 && buffer[0] !== '{') {
        buffer = '{' + buffer;
      }

      // Check if the last character of the buffer is a closing bracket
      if (buffer.length > 0 && buffer[buffer.length - 1] !== '}') {
        buffer = buffer + '}';
      }

      // Now, try to parse the buffer string as a JSON object
      console.log("Buffer before parsing: " + buffer);
      let parsedBuffer = JSONTryParse(buffer);
      if (parsedBuffer !== false) {
          console.log({ parsedBuffer })
          // parsedBuffer is already a JSON object, so you can assign it directly
          const json = parsedBuffer as Scene;
          console.log({ json });
      } else {
          console.error(`Error parsing JSON: ${buffer}`);
      }


      // Check if the reader has finished reading
      await reader.closed;
      
      if (parsedBuffer !== false) {
        // parsedBuffer is already a JSON object, so you can use it directly
        const parsedData = parsedBuffer;
        console.log('Parsed data:', parsedData);
        currentScene = parsedData as Scene; // Ensure you have defined Scene to match your scene structure
        console.log({ currentScene });
        generatedScenes.push(currentScene);
        console.log(`Received scene: ${JSON.stringify(currentScene)}`);
      } else {
          console.error(`Error parsing data: ${buffer}`);
      }

      // Delay to let the state update with the newly generated scene
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Update the generatedLore state by stringifying the generatedScenes array
    console.log({ generatedScenes })
    setGeneratedLore(JSON.stringify(generatedScenes));

    scrollToLore();
    setLoading(false);
    console.log("Finished generating lore."); // log when finished
  };

  useEffect(() => {
    // check if fetching is done (i.e., string ends with "]")
    if (generatedLore.endsWith("]")) {
      console.log(`In useEffect, generatedLore is now: ${generatedLore}`);
      try {
        // parse the lore into objects and set the loreFile state
        setLoreFile(JSON.parse(generatedLore));
      } catch (error) {
        console.error("Failed to parse lore:", error);
      }
    }
  }, [generatedLore]);

  if (loreFile?.length > 0) {
    console.log(`loreFile is now: `, loreFile);
    console.log({ loreFile })
  }

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Lore Machine .lore Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        
        <h1 className="sm:text-6xl text-4xl max-w-[708px] font-bold text-slate-900">
          Media Generation <br/> at Story Scale
        </h1>
        <p className="text-slate-500 mt-5">47,118 lores generated so far.</p>
        
        <div className="max-w-xl w-full">
          <div className="flex items-center space-x-3">
            <Image
              src="/1-black.png"
              width={30}
              height={30}
              alt="1 icon"
              className="mb-5 sm:mb-0"
            />
            <p className="text-left font-medium">
              Write Your Own Story{" "}
              <span className="text-slate-500">
                (or copy paste a story you like)
              </span>
              .
            </p>
          </div>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            rows={4}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
            placeholder={
              "Once upon a time..."
            }
          />

          {!loading && (
            <>
            <button
              className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              onClick={(e) => segmentStory(e)}
            >
              Segment Story &rarr;
            </button>

            <Col>
              <Text>{'Images'}</Text>
              <span className="text-slate-500">
                (or copy paste a story you like)
              </span>
              <Slider marks={marks} step={10} defaultValue={37} />
            </Col>

            <button
              className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              onClick={(e) => generateLore(e)}
            >
              Generate Lore &rarr;
            </button>
            </>
          )}

          {loading && (
            <button
              className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              disabled
            >
              <LoadingDots color="white" style="large" />
            </button>
          )}
        </div>
        
        {
            generatedLore && (
              <button 
              className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 flex items-center space-x-2"

              onClick={downloadLoreAsJSON}>
                <FiDownload className="h-5 w-5"/>
                <span>Download Lore</span>
              </button>
            )
          }

        <div className="space-y-10 my-10">
          {generatedLore && (
            <>
              <div>
                <h2
                  className="sm:text-4xl text-3xl font-bold text-slate-900 mx-auto"
                  ref={loreRef}
                >
                  Your generated Lore
                </h2>
              </div>
              <div className="space-y-8 flex flex-col items-center justify-center max-w-xl mx-auto">
                      <div
                        className="bg-white rounded-xl shadow-md p-4 hover:bg-gray-100 transition cursor-copy border"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedLore);
                          toast("Lore copied to clipboard", {
                            icon: "✂️",
                          });
                        }}
                        key={generatedLore}
                      >
                        <p>{generatedLore}</p>
                      </div>
              </div>


            </>
          )}
        </div>
      </main>
    </div>
  )
}
                
export default Home;
