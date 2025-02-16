import express from "express";
import cors from "cors";
import { createClient } from "@deepgram/sdk";
import fs from 'fs/promises';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;

// Add PostgreSQL connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // replace with your database name
  password: 'admin', // replace with your password
  port: 5432,
});

//Express server configuration and Deepgram client setup
const app = express();
const port = 5000;
const deepgram = createClient("dade834708f60340f515b0565846da91c7b7d745");

// Middleware setup
app.use(cors());
app.use(express.json());


//Save interview conversation to a JSON file
app.post("/save-conversation", async (req, res) => {
  try {
    const { conversation, candidateName, candidateId, postId } = req.body;
   
    if (!conversation || !candidateId || !postId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create main conversations directory
    const conversationsDir = path.join(process.cwd(), 'conversations');
    await fs.mkdir(conversationsDir, { recursive: true });

    // Create post-specific directory
    const postDir = path.join(conversationsDir, `post_${postId}`);
    await fs.mkdir(postDir, { recursive: true });
   
    const date = new Date();
    const timestamp = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    const filename = `${candidateId}_${timestamp}.json`;
    const filepath = path.join(postDir, filename);
   
    await fs.writeFile(
      filepath,
      JSON.stringify(conversation, null, 2),
      'utf-8'
    );
   
    res.status(200).json({
      message: 'Conversation saved successfully',
      filepath: filepath
    });
  } catch (error) {
    console.error('Error saving conversation:', error);
    res.status(500).json({
      error: 'Failed to save conversation',
      details: error.message
    });
  }
});

// Save interview rankings to a JSON file
app.post("/save-rankings", async (req, res) => {
  try {
    const { rankings, candidateName, candidateId, postId } = req.body;
    
    if (!rankings || !candidateId || !postId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create main rankings directory
    const rankingsDir = path.join(process.cwd(), 'rankings');
    await fs.mkdir(rankingsDir, { recursive: true });

    // Create post-specific directory
    const postDir = path.join(rankingsDir, `post_${postId}`);
    await fs.mkdir(postDir, { recursive: true });
    
    const date = new Date();
    const timestamp = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    const filename = `${candidateId}_${timestamp}.json`;
    const filepath = path.join(postDir, filename);
    
    const rankingsData = {
      candidateName,
      candidateId,
      postId,  // Adding postId to the stored data
      date: date.toISOString(),
      scores: {
        fluency: rankings[0],
        subjectKnowledge: rankings[1],
        professionalBehavior: rankings[2]
      },
      feedback: rankings[3]
    };
    
    await fs.writeFile(
      filepath,
      JSON.stringify(rankingsData, null, 2),
      'utf-8'
    );
    
    res.status(200).json({
      message: 'Rankings saved successfully',
      filepath: filepath
    });
  } catch (error) {
    console.error('Error saving rankings:', error);
    res.status(500).json({
      error: 'Failed to save rankings',
      details: error.message
    });
  }
});

// Update get-conversation endpoint
app.get("/get-conversation/:postId/:filename", async (req, res) => {
  try {
    const { postId, filename } = req.params;
    const conversationsDir = path.join(process.cwd(), 'conversations');
    const postDir = path.join(conversationsDir, `post_${postId}`);
    const filepath = path.join(postDir, `${filename}.json`);
    
    const content = await fs.readFile(filepath, 'utf-8');
    res.json(JSON.parse(content));
  } catch (error) {
    console.error('Error reading conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Add these new endpoints
app.get('/get-conversation/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const conversationsDir = path.join(process.cwd(), 'Server', 'conversations', `post_${postId}`);
    
    // Check if directory exists
    try {
      await fs.access(conversationsDir);
    } catch (error) {
      return res.json([]); // Return empty array if directory doesn't exist
    }
    
    const files = await fs.readdir(conversationsDir);
    const conversations = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(conversationsDir, file), 'utf8');
        conversations.push(JSON.parse(content));
      }
    }

    res.json(conversations);
  } catch (error) {
    console.error('Error reading conversations:', error);
    res.json([]); // Return empty array on error
  }
});

app.get('/get-mcq-results/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const mcqDir = path.join(process.cwd(), 'Server', 'mcq_responses', `post_${postId}`);
    
    // Check if directory exists
    try {
      await fs.access(mcqDir);
    } catch (error) {
      return res.json([]); // Return empty array if directory doesn't exist
    }

    const files = await fs.readdir(mcqDir);
    const results = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(mcqDir, file), 'utf8');
        const mcqResult = JSON.parse(content);
        
        // Calculate score
        const totalQuestions = mcqResult.mcqResponses.length;
        const correctAnswers = mcqResult.mcqResponses.filter(
          r => r.selectedAnswer === r.correctAnswer
        ).length;
        mcqResult.score = Math.round((correctAnswers / totalQuestions) * 100);
        
        results.push(mcqResult);
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error reading MCQ results:', error);
    res.json([]); // Return empty array on error
  }
});

app.get('/get-rankings/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const rankingsDir = path.join(process.cwd(), 'Server', 'rankings', `post_${postId}`);
    
    // Check if directory exists
    try {
      await fs.access(rankingsDir);
    } catch (error) {
      return res.json([]); // Return empty array if directory doesn't exist
    }

    const files = await fs.readdir(rankingsDir);
    const rankings = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(rankingsDir, file), 'utf8');
        rankings.push(JSON.parse(content));
      }
    }

    res.json(rankings);
  } catch (error) {
    console.error('Error reading rankings:', error);
    res.json([]); // Return empty array on error
  }
});

// Update the update-panel-review endpoint
app.put("/update-panel-review", async (req, res) => {
  try {
    const { candidateName, date, review, postId } = req.body;
    
    // Get the candidate ID from the database using candidateName
    const query = `
      SELECT candidate_id 
      FROM candidates 
      WHERE name = $1
    `;
    
    const result = await pool.query(query, [candidateName]);
    
    if (result.rows.length === 0) {
      throw new Error('Candidate not found');
    }

    const candidateId = result.rows[0].candidate_id;
    
    const dateObj = new Date(date);
    const formattedDate = `${dateObj.getDate()}-${dateObj.getMonth() + 1}-${dateObj.getFullYear()}`;
    
    // Update file path to include post_id directory
    const rankingsDir = path.join(process.cwd(), 'rankings');
    const postDir = path.join(rankingsDir, `post_${postId}`);
    const filename = `${candidateId}_${formattedDate}.json`;
    const filePath = path.join(postDir, filename);

    // Read existing file
    const fileData = JSON.parse(await fs.readFile(filePath, 'utf8'));
    
    // Add or update panel review
    fileData.panelReview = {
      text: review.text,
      timestamp: review.timestamp
    };

    // Write updated data back to file
    await fs.writeFile(filePath, JSON.stringify(fileData, null, 2), 'utf8');

    res.status(200).json({
      message: 'Panel review updated successfully',
      data: fileData
    });

  } catch (error) {
    console.error('Error updating panel review:', error);
    res.status(500).json({
      error: 'Failed to update panel review',
      details: error.message
    });
  }
});

// Update get-rankings endpoint to filter by postId
app.get("/get-rankings/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const rankingsDir = path.join(process.cwd(), 'rankings');
    const postPath = path.join(rankingsDir, `post_${postId}`);
    
    // Check if post directory exists
    try {
      await fs.access(postPath);
    } catch (error) {
      return res.json([]); // Return empty array if directory doesn't exist
    }
    
    const files = await fs.readdir(postPath);
    
    // Get rankings from each file in the post directory
    const postRankings = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          try {
            const content = await fs.readFile(path.join(postPath, file), 'utf-8');
            return JSON.parse(content);
          } catch (error) {
            console.error(`Error processing file ${file}:`, error);
            return null;
          }
        })
    );
    
    // Filter out null results and format for response
    const formattedRankings = postRankings
      .filter(ranking => ranking !== null)
      .map(ranking => ({
        candidateName: ranking.candidateName,
        candidateId: ranking.candidateId,
        postId: ranking.postId,
        date: ranking.date,
        scores: ranking.scores,
        feedback: ranking.feedback,
        panelReview: ranking.panelReview
      }));

    res.json(formattedRankings);
  } catch (error) {
    console.error('Error reading rankings:', error);
    res.status(500).json({
      error: 'Failed to fetch rankings',
      details: error.message
    });
  }
});

// Update the save-mcq endpoint
app.post("/save-mcq", async (req, res) => {
  try {
    const { mcqResponses, candidateName, candidateId, postId } = req.body;

    // Validate required fields
    if (!mcqResponses || !candidateId || !postId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Save MCQ responses to file system
    const mcqDir = path.join(process.cwd(), "mcq_responses");
    await fs.mkdir(mcqDir, { recursive: true });
    const postDir = path.join(mcqDir, `post_${postId}`);
    await fs.mkdir(postDir, { recursive: true });

    const date = new Date();
    const timestamp = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    const filename = `${candidateId}_${timestamp}.json`;
    const filepath = path.join(postDir, filename);

    await fs.writeFile(
      filepath,
      JSON.stringify({
        candidateName,
        candidateId,
        postId,
        date: date.toISOString(),
        mcqResponses
      }, null, 2),
      "utf-8"
    );

    // Check for existing interview entry but don't modify it
    const checkQuery = `
      SELECT interview_id 
      FROM interviews 
      WHERE candidate_id = $1 
      AND post_id = $2 
      AND interview_stage = 1
    `;
    
    const existingInterview = await pool.query(checkQuery, [candidateId, postId]);
    
    res.status(200).json({
      message: "MCQ responses saved successfully",
      interviewId: existingInterview.rows[0]?.interview_id
    });

  } catch (error) {
    console.error("Error saving MCQ responses:", error);
    res.status(500).json({
      error: "Failed to save MCQ responses",
      details: error.message
    });
  }
});

app.get("/get-candidate-info/:candidateId", async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const query = `
      SELECT name, post_id 
      FROM candidates 
      WHERE candidate_id = $1::integer
    `;
    
    const result = await pool.query(query, [parseInt(candidateId, 10)]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    res.json({
      candidateName: result.rows[0].name,
      postId: result.rows[0].post_id
    });
  } catch (error) {
    console.error('Error fetching candidate info:', error);
    res.status(500).json({ error: "Failed to fetch candidate information" });
  }
});

// Get MCQ results
app.get("/get-mcq-results/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const mcqDir = path.join(process.cwd(), "mcq_responses");
    const postPath = path.join(mcqDir, `post_${postId}`);
    
    // Check if post directory exists
    try {
      await fs.access(postPath);
    } catch (error) {
      return res.json([]); // Return empty array if directory doesn't exist
    }
    
    const files = await fs.readdir(postPath);
    
    // Get MCQ responses from each file in the post directory
    const results = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          try {
            const content = await fs.readFile(path.join(postPath, file), 'utf-8');
            return JSON.parse(content);
          } catch (error) {
            console.error(`Error processing file ${file}:`, error);
            return null;
          }
        })
    );
    
    // Filter out null results and format for response
    const formattedResults = results
      .filter(result => result !== null)
      .map(result => ({
        candidateName: result.candidateName,
        candidateId: result.candidateId,
        postId: result.postId,
        date: result.date,
        mcqResponses: result.mcqResponses
      }));
    
    res.json(formattedResults);
  } catch (error) {
    console.error('Error reading MCQ results:', error);
    res.status(500).json({
      error: 'Failed to fetch MCQ results',
      details: error.message
    });
  }
});

//Convert text to speech using Deepgram API
app.post("/speak", async (req, res) => {
  try {
    const { text } = req.body;
    
    // Request speech synthesis from Deepgram
    const response = await deepgram.speak.request(
      { text },
      {
        model: "aura-asteria-en",
        encoding: "linear16",
        container: "wav",
      }
    );

    // Get audio stream and convert to buffer
    const stream = await response.getStream();
    const buffer = await getAudioBuffer(stream);

    // Send audio file response
    res.set({
      "Content-Type": "audio/wav",
      "Content-Disposition": 'attachment; filename="speech.wav"',
    });
    res.send(buffer);
  } catch (error) {
    console.error("Error generating audio:", error);
    res.status(500).send("Error generating audio");
  }
});


//Convert ReadableStream to Buffer
const getAudioBuffer = async (response) => {
  const reader = response.getReader();
  const chunks = [];

  // Read all chunks from the stream
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Combine chunks into a single Uint8Array
  const dataArray = chunks.reduce(
    (acc, chunk) => Uint8Array.from([...acc, ...chunk]),
    new Uint8Array(0)
  );

  return Buffer.from(dataArray.buffer);
};

// Add save-post endpoint
app.post("/save-post", async (req, res) => {
  try {
    const {
      title,
      description,
      minimum_experience,
      category,
      exam_type,
      followup,
      coverage,
      time,
      application_deadline,
      test_start_date
    } = req.body;

    const query = `
      INSERT INTO posts (
        title, description, minimum_experience, category,
        exam_type, followup, coverage, time,
        application_deadline, test_start_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING post_id`;

    const values = [
      title,
      description,
      minimum_experience,
      category,
      exam_type,
      exam_type === 'MCQ' ? null : followup,
      exam_type === 'MCQ' ? null : coverage,
      time,
      application_deadline,
      test_start_date
    ];

    const result = await pool.query(query, values);
    res.status(201).json({
      message: 'Post created successfully',
      post_id: result.rows[0].post_id
    });

  } catch (error) {
    console.error('Error saving post:', error);
    res.status(500).json({
      error: 'Failed to save post',
      details: error.message
    });
  }
});

// Add delete-post endpoint
app.delete("/delete-post/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    // Delete the post from the database
    const query = 'DELETE FROM posts WHERE post_id = $1 RETURNING *';
    const result = await pool.query(query, [postId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Post not found'
      });
    }

    res.status(200).json({
      message: 'Post deleted successfully',
      deletedPost: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      error: 'Failed to delete post',
      details: error.message
    });
  }
});

// Add endpoint to fetch panel members
app.get("/panel-members", async (req, res) => {
  try {
    const query = `
      SELECT userid, username 
      FROM users 
      WHERE role = 'panel'
      ORDER BY username`;
    
    const result = await pool.query(query);
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching panel members:', error);
    res.status(500).json({
      error: 'Failed to fetch panel members',
      details: error.message
    });
  }
});

// Add update-panel endpoint
app.put("/update-panel", async (req, res) => {
  try {
    const { post_id, panels, exam_type } = req.body;

    // Validate panels based on exam type
    if (!Array.isArray(panels)) {
      return res.status(400).json({ 
        error: 'Invalid panel data. Panels must be an array.' 
      });
    }

    if (exam_type === 'MCQ' && panels.length !== 1) {
      return res.status(400).json({ 
        error: 'MCQ posts require exactly 1 panel member.' 
      });
    }

    if (exam_type !== 'MCQ' && panels.length !== 3) {
      return res.status(400).json({ 
        error: 'Interview posts require exactly 3 panel members.' 
      });
    }

    // Join panels with comma to store in database
    const panelString = panels.join(',');

    const query = `
      UPDATE posts 
      SET panel_id = $1
      WHERE post_id = $2
      RETURNING *`;

    const result = await pool.query(query, [panelString, post_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.status(200).json({
      message: 'Panels assigned successfully',
      post: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating panels:', error);
    res.status(500).json({
      error: 'Failed to update panels',
      details: error.message
    });
  }
});

// Add endpoint to get all posts
app.get("/posts", async (req, res) => {
  try {
    const query = 'SELECT * FROM posts ORDER BY created_at DESC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      error: 'Failed to fetch posts',
      details: error.message
    });
  }
});

app.put("/update-post/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const {
      title,
      description,
      minimum_experience,
      category,
      exam_type,
      followup,
      coverage,
      time,
      application_deadline,
      test_start_date
    } = req.body;

    const query = `
      UPDATE posts 
      SET title = $1,
          description = $2,
          minimum_experience = $3,
          category = $4,
          exam_type = $5,
          followup = $6,
          coverage = $7,
          time = $8,
          application_deadline = $9,
          test_start_date = $10
      WHERE post_id = $11
      RETURNING *`;

    const values = [
      title,
      description,
      minimum_experience,
      category,
      exam_type,
      followup,
      coverage,
      time,
      application_deadline,
      test_start_date,
      postId
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Post not found'
      });
    }

    res.status(200).json({
      message: 'Post updated successfully',
      post: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({
      error: 'Failed to update post',
      details: error.message
    });
  }
});

// Add new endpoint to save feedback
app.post("/save-mcq-feedback", async (req, res) => {
  try {
    const { interviewId, feedback } = req.body;

    const query = `
      UPDATE interviews
      SET interview_feedback = $1
      WHERE interview_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [feedback, interviewId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Interview not found" });
    }

    res.status(200).json({
      message: "Feedback saved successfully",
      interview: result.rows[0]
    });
  } catch (error) {
    console.error("Error saving feedback:", error);
    res.status(500).json({
      error: "Failed to save feedback",
      details: error.message
    });
  }
});

 // Update save-interview endpoint
app.post("/save-interview", async (req, res) => {
  try {
    const {
      candidateId,
      postId,
      interviewStage,
      selected,
      report_to_hr,
      interviewFeedback
    } = req.body;

    // Check if an interview entry already exists
    const checkQuery = `
      SELECT interview_id 
      FROM interviews 
      WHERE candidate_id = $1 
      AND post_id = $2 
      AND interview_stage = $3
    `;
    
    const existingInterview = await pool.query(checkQuery, [candidateId, postId, interviewStage]);

    if (existingInterview.rows.length > 0) {
      // Update existing interview
      const updateQuery = `
        UPDATE interviews 
        SET interview_feedback = COALESCE($1, interview_feedback),
            selected = $2,
            report_to_hr = $3,
            createdat = CURRENT_TIMESTAMP
        WHERE interview_id = $4
        RETURNING interview_id
      `;

      const result = await pool.query(updateQuery, [
        interviewFeedback || null,
        selected || 'no',
        report_to_hr || 'no',
        existingInterview.rows[0].interview_id
      ]);

      return res.status(200).json({
        message: "Interview data updated successfully",
        interviewId: result.rows[0].interview_id
      });
    }

    // Insert new interview
    const insertQuery = `
      INSERT INTO interviews (
        candidate_id,
        post_id,
        interview_stage,
        interview_feedback,
        selected,
        report_to_hr
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING interview_id
    `;

    const values = [
      candidateId,
      postId,
      interviewStage,
      interviewFeedback || null,
      selected || 'no',
      report_to_hr || 'no'
    ];

    const result = await pool.query(insertQuery, values);

    res.status(200).json({
      message: "Interview data saved successfully",
      interviewId: result.rows[0].interview_id
    });
  } catch (error) {
    console.error("Error saving interview:", error);
    res.status(500).json({
      error: "Failed to save interview",
      details: error.message
    });
  }
});

// Add save-interview-feedback endpoint
app.put("/save-interview-feedback", async (req, res) => {
  try {
    const { interviewId, feedback } = req.body;

    const query = `
      UPDATE interviews
      SET interview_feedback = $1
      WHERE interview_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [feedback, interviewId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Interview not found" });
    }

    res.status(200).json({
      message: "Feedback saved successfully",
      interview: result.rows[0]
    });
  } catch (error) {
    console.error("Error saving feedback:", error);
    res.status(500).json({
      error: "Failed to save feedback",
      details: error.message
    });
  }
});

// Update the report-to-hr endpoint
app.post("/report-to-hr", async (req, res) => {
  try {
    const { postId, candidateIds } = req.body;

    if (!postId || !candidateIds || !Array.isArray(candidateIds)) {
      return res.status(400).json({ 
        error: 'Invalid request data. Required: postId and array of candidateIds' 
      });
    }

    // Update all interviews for the specified candidates and post
    const query = `
      UPDATE interviews 
      SET report_to_hr = 'yes'
      WHERE post_id = $1 
      AND candidate_id = ANY($2::int[])
      RETURNING interview_id, candidate_id
    `;

    const result = await pool.query(query, [postId, candidateIds]);

    // If no rows were updated, create new interview entries
    if (result.rows.length === 0) {
      const insertValues = candidateIds.map(candidateId => ({
        candidate_id: candidateId,
        post_id: postId,
        interview_stage: 2,
        selected: 'no',
        report_to_hr: 'yes'
      }));

      const insertQuery = `
        INSERT INTO interviews (candidate_id, post_id, interview_stage, selected, report_to_hr)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING interview_id, candidate_id
      `;

      const insertPromises = insertValues.map(values => 
        pool.query(insertQuery, [
          values.candidate_id,
          values.post_id,
          values.interview_stage,
          values.selected,
          values.report_to_hr
        ])
      );

      await Promise.all(insertPromises);
    }

    res.status(200).json({
      message: 'Successfully reported to HR',
      updatedCount: candidateIds.length
    });

  } catch (error) {
    console.error('Error reporting to HR:', error);
    res.status(500).json({
      error: 'Failed to report to HR',
      details: error.message
    });
  }
});

// Add endpoint to check report status
app.get('/check-report-status/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM interviews i
        WHERE i.post_id = $1 
        AND i.report_to_hr = 'yes'
      ) as has_reported,
      EXISTS (
        SELECT 1 FROM interviews i
        WHERE i.post_id = $1 
        AND i.selected = 'yes'
      ) as has_reportable
    `;
    
    const result = await pool.query(query, [postId]);
    res.json({
      hasReported: result.rows[0]?.has_reported || false,
      hasReportable: result.rows[0]?.has_reportable || false
    });
  } catch (error) {
    console.error('Error checking report status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this endpoint to get reportable candidates
app.get('/get-reportable-candidates/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const query = `
      SELECT 
        i.interview_id,
        i.candidate_id,
        c.name as candidate_name,
        i.interview_stage,
        i.selected,
        i.createdat,
        c.selected as candidate_selected
      FROM interviews i
      JOIN candidates c ON i.candidate_id = c.candidate_id
      WHERE i.post_id = $1 AND i.report_to_hr = 'yes'
      ORDER BY i.createdat DESC
    `;
    
    const result = await pool.query(query, [postId]);
    
    const processedRows = result.rows.map(row => ({
      ...row,
      selected: row.candidate_selected === 'yes' ? 'yes' : row.selected
    }));

    const mcqCandidates = processedRows.filter(row => row.interview_stage === 1);
    const interviewCandidates = processedRows.filter(row => row.interview_stage === 2);

    res.json({
      mcq: mcqCandidates,
      interview: interviewCandidates
    });
  } catch (error) {
    console.error('Error fetching reportable candidates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this endpoint to update selected candidates
app.post('/update-selected-candidates', async (req, res) => {
  const client = await pool.connect();
  try {
    const { candidateIds, postId, action = 'select' } = req.body;
    const selectedValue = action === 'deselect' ? 'no' : 'yes';
    
    await client.query('BEGIN');

    // Update interviews table
    await client.query(`
      UPDATE interviews 
      SET selected = $1
      WHERE interview_id = ANY($2::int[])
      AND post_id = $3
      AND report_to_hr = 'yes'
    `, [selectedValue, candidateIds, postId]);

    // Get candidate IDs from the interviews that were updated
    const result = await client.query(`
      SELECT DISTINCT candidate_id 
      FROM interviews 
      WHERE interview_id = ANY($1::int[])
    `, [candidateIds]);

    // Update candidates table
    await client.query(`
      UPDATE candidates 
      SET selected = $1::selected_status
      WHERE candidate_id = ANY($2::int[])
      AND post_id = $3
    `, [selectedValue, result.rows.map(r => r.candidate_id), postId]);

    await client.query('COMMIT');
    res.json({ success: true });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating selected candidates:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Fix the end recruitment endpoint
app.post('/end-recruitment', async (req, res) => {
  const client = await pool.connect();
  try {
    const { postId } = req.body;
    
    await client.query('BEGIN');

    // First update the selected candidates
    const updateSelectedQuery = `
      UPDATE candidates 
      SET selected = 'yes'::selected_status,
          progress = 'completed'::progress_status
      WHERE candidate_id IN (
        SELECT candidate_id 
        FROM interviews 
        WHERE post_id = $1 
        AND selected = 'yes'
      )
    `;
    await client.query(updateSelectedQuery, [postId]);

    // Then update the rejected candidates
    const updateRejectedQuery = `
      UPDATE candidates 
      SET selected = 'no'::selected_status,
          progress = 'completed'::progress_status
      WHERE post_id = $1 
      AND candidate_id NOT IN (
        SELECT candidate_id 
        FROM interviews 
        WHERE post_id = $1 
        AND selected = 'yes'
      )
    `;
    await client.query(updateRejectedQuery, [postId]);

    // Update post status using correct table name
    const updatePostQuery = `
      UPDATE posts
      SET status = 'completed'
      WHERE post_id = $1
    `;
    await client.query(updatePostQuery, [postId]);

    await client.query('COMMIT');
    res.json({ success: true });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error ending recruitment:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update the check recruitment status endpoint
app.get('/check-recruitment-status/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM posts p
        WHERE p.post_id = $1 
        AND (
          p.status = 'completed'
          OR EXISTS (
            SELECT 1 FROM candidates c
            WHERE c.post_id = $1
            AND c.selected = 'yes'
            AND EXISTS (
              SELECT 1 FROM interviews i
              WHERE i.candidate_id = c.candidate_id
              AND i.post_id > $1
            )
          )
        )
      ) as is_completed
    `;
    
    const result = await pool.query(query, [postId]);
    res.json({
      isCompleted: result.rows[0]?.is_completed || false
    });
  } catch (error) {
    console.error('Error checking recruitment status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fix the check recruitment status endpoint
app.get('/check-recruitment-status/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Check if any candidates are selected and have a post_id that's different from current post
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM candidates c
        WHERE c.candidate_id IN (
          SELECT candidate_id 
          FROM interviews 
          WHERE post_id = $1
        )
        AND c.selected = 'yes'
        AND EXISTS (
          SELECT 1 FROM interviews i
          WHERE i.candidate_id = c.candidate_id
          AND i.post_id != $1
        )
      ) as is_completed
    `;
    
    const result = await pool.query(query, [postId]);
    res.json({
      isCompleted: result.rows[0]?.is_completed || false
    });
  } catch (error) {
    console.error('Error checking recruitment status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get interview stage
app.get('/get-interview-stage/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const query = `
      SELECT MAX(interview_stage) as stage
      FROM interviews
      WHERE post_id = $1
    `;
    
    const result = await pool.query(query, [postId]);
    res.json({ stage: result.rows[0]?.stage || 1 });
  } catch (error) {
    console.error('Error getting interview stage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle new recruitment
app.post('/new-recruitment', async (req, res) => {
  const client = await pool.connect();
  try {
    const { postId, candidateIds, currentPostId, isNewPost } = req.body;
    
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO interviews 
      (candidate_id, post_id, interview_stage, selected, createdat, report_to_hr)
      SELECT 
        i.candidate_id,
        $1 as post_id,
        1 as interview_stage,
        'no' as selected,
        NOW() as createdat,
        'no' as report_to_hr
      FROM interviews i
      WHERE i.post_id = $2 
      AND i.candidate_id = ANY($3::int[])
      AND NOT EXISTS (
        SELECT 1 FROM interviews existing
        WHERE existing.post_id = $1
        AND existing.candidate_id = i.candidate_id
      )
    `;

    await client.query(insertQuery, [postId, currentPostId, candidateIds]);
    await client.query('COMMIT');
    
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating new interviews:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});