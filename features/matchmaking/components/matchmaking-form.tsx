"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface MatchmakingFormProps {
  createMatch: (formData: FormData) => Promise<void>;
}

const MatchmakingForm = ({ createMatch }: MatchmakingFormProps) => {
  return (
    <form
      className="flex w-full max-w-sm items-start gap-4 flex-col rounded-xl border p-4 mb-6"
      action={createMatch}
    >
      <div className="flex flex-col gap-2 w-full">
        <p className="font-bold">Our team</p>
        <Input
          type="number"
          name="eloSacha"
          min={0}
          placeholder="Peak elo Sacha"
          aria-label="Elo Sacha"
          className="w-full"
          defaultValue={569}
          required
        />
        <Input
          type="number"
          name="eloMathieu"
          min={0}
          placeholder="Peak elo Mathieu"
          aria-label="Elo Mathieu"
          className="w-full"
          defaultValue={610}
          required
        />
        <Input
          type="number"
          name="teamGoals"
          min={0}
          placeholder="Team goals"
          aria-label="Team goals"
          className="w-full"
          required
        />
      </div>

      <div className="flex flex-col gap-2 w-full">
        <p className="font-bold">Enemy team</p>
        <Input
          type="number"
          name="eloOpponent1"
          min={0}
          placeholder="Peak elo opponent 1"
          aria-label="Elo opponent 1"
          className="w-full"
          required
        />
        <Input
          type="number"
          name="eloOpponent2"
          min={0}
          placeholder="Peak elo opponent 2"
          aria-label="Elo opponent 2"
          className="w-full"
          required
        />
        <Input
          type="number"
          name="opponentGoals"
          min={0}
          placeholder="Opponents goals"
          aria-label="Opponents goals"
          className="w-full"
          required
        />
        <div className="flex items-center space-x-2">
          <Checkbox name="isSmurfGame" className="mt-2 cursor-pointer" />
          <label htmlFor="isSmurfGame" className="text-sm font-bold mt-1.5">
            Smurf game
          </label>
        </div>
      </div>

      <div className="w-full flex justify-end">
        <Button type="submit" variant="default">
          Submit
        </Button>
      </div>
    </form>
  );
};

export default MatchmakingForm;
