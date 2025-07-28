import React from 'react';

interface SecretFormProps {
  name: string;
}

const SecretForm: React.FC<SecretFormProps> = ({ name }) => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
      <h3 className="font-semibold text-yellow-800">Missing API Key</h3>
      <p className="text-yellow-700 text-sm mt-1">
        The {name} environment variable needs to be set in your Supabase project secrets.
      </p>
      <p className="text-yellow-700 text-sm mt-2">
        Please add your OpenAI API key in the Supabase dashboard under Settings → Edge Functions → Environment variables.
      </p>
    </div>
  );
};

export default SecretForm;