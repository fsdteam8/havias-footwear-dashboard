/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, ImageIcon, X, Loader2, Save } from "lucide-react"; // Added X icon
import Image from "next/image";
import "react-quill/dist/quill.snow.css";
import { TagsInput } from "@/components/ui/tagsInput";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ColorsResponse } from "../../../../../../types/colorDataTypes";
import Title from "../../_components/Title";

// React Quill Setup
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
const quillModules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    [{ font: [] }],
    ["bold", "italic", "underline"],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["code-block"],
  ],
};
const quillFormats = [
  "header",
  "font",
  "bold",
  "italic",
  "underline",
  "align",
  "list",
  "bullet",
  "code-block",
];

// Schema
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  msrp: z.string().optional(),
  moq: z.string().optional(),
  unitPrice: z.string().optional(),
  packPrice: z.string().optional(),
  quantity: z.string().optional(),
  description: z.string().optional(),
  category: z.string().nonempty("Category is required"),
  productType: z.string().optional(),
  subCategory: z.string().nonempty("Category is required"),
  brandName: z.string().optional(),
  size: z.array(z.string()).min(1, "At least one size is required"),
  color: z.string().nonempty("Color is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function AddProduct() {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [deactiveSubCategory, setDeactiveSubCategory] = useState(false);
  const [deactiveProductType, setDeactiveProductType] = useState(false);
  const session = useSession();
  const token = (session?.data?.user as { accessToken: string })?.accessToken;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      msrp: "",
      moq: "",
      unitPrice: "",
      packPrice: "",
      quantity: "",
      description: "",
      category: "",
      productType: "",
      subCategory: "",
      brandName: "",
      size: [],
      color: "",
    },
  });

  // Fetch categories
  const { data: categoriesData } = useQuery<any>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/category/all-categories?page=1&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        toast.error("Failed to fetch categories");
        return;
      }
      return res.json();
    },
    enabled: !!token,
  });

  const { data: colorsData } = useQuery<ColorsResponse>({
    queryKey: ["color"],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/color?page=${1}&limit=${50}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch colors");
      return res.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (!selectedCategory) return;

    // Set product types
    const types = selectedCategory.productType || [];
    setProductTypes(types);
    form.setValue("productType", "");
    setDeactiveProductType(types.length === 0); // disable if no product types

    // Fetch subcategories
    const fetchSubCategories = async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/sub-category/category/${selectedCategory._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        setDeactiveSubCategory(true);
        setSubCategories([]);
        return;
      }

      const data = await res.json();
      const subCats = data.data.subCategories || [];
      setSubCategories(subCats);
      form.setValue("subCategory", "");
      setDeactiveSubCategory(subCats.length === 0); // disable if no subcategories
    };

    fetchSubCategories();
  }, [selectedCategory, token, form]);

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setUploadedFiles((prev) => [...prev, ...files]);

    const previewUrls = files.map((file) => URL.createObjectURL(file));
    setUploadedImages((prev) => [...prev, ...previewUrls]);
    e.target.value = ""; // This resets the file input so the same file can be selected again after being removed
  };

  // Image Remove Handler
  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Mutation
  const createProductMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/product`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create product");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Product created successfully");
      form.reset();
      setUploadedImages([]);
      setUploadedFiles([]);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create product");
    },
  });

  // Submit
  const onSubmit = (data: FormData) => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one product image");
      return;
    }

    const body = new FormData();

    // Append images
    uploadedFiles.forEach((file) => body.append("images", file));

    // Append fields
    body.append("title", data.title);
    if (data.msrp) body.append("msrp", data.msrp);
    if (data.moq) body.append("moq", data.moq);
    if (data.unitPrice) body.append("unitPrice", data.unitPrice);
    if (data.packPrice) body.append("discountPrice", data.packPrice);
    if (data.quantity) body.append("quantity", data.quantity);
    if (data.description) body.append("description", data.description ?? "");
    if (data.category) body.append("category", data.category);
    if (data.subCategory) body.append("subCategory", data.subCategory);
    if (data.productType) body.append("productType", data.productType);
    if (data.brandName) body.append("brand", data.brandName);

    // Append arrays
    data.size?.forEach((s) => body.append("sizes[]", s));
    if (data.color) {
      body.append("colors[]", data.color); // backend will see ["red"]
    }

    createProductMutation.mutate(body);
  };

  return (
    <div className="min-h-screen">
      <div className="">
        <div className="mb-12">
          <Title title="Add Products" active="Dashboard > Add Products > Add" />
        </div>

        <Form {...form}>
          <form
            id="product-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title */}
              <Card>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-gray-900">
                          Add Title
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Add your title..."
                            className="w-full h-[50px] border border-[#B6B6B6]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* MSRP & MOQ */}
              <Card>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="msrp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>MSRP</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Manufacturer's Suggested Retail Price..."
                            className="h-[50px] border border-[#B6B6B6]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="moq"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>MOQ</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Minimum Order Quantity..."
                            className="h-[50px] border border-[#B6B6B6]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Price & Quantity */}
              <Card>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="unitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Price per unit..."
                            className="h-[50px] border border-[#B6B6B6]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="packPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Only when product is sold in packs..."
                            className="h-[50px] border border-[#B6B6B6]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Add Quantity..."
                            className="h-[50px] border border-[#B6B6B6]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Description */}
              <Card>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <ReactQuill
                            theme="snow"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Enter product description..."
                            modules={quillModules}
                            formats={quillFormats}
                            className="h-[200px]"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              <br className="my-3" />
              {/* Size Tags Input */}
              <Card className="!pt-10">
                <CardContent>
                  <Label className="text-sm font-medium pb-2 text-[#595959]">
                    Size
                  </Label>
                  <Controller
                    name="size"
                    control={form.control}
                    render={({ field }) => (
                      <TagsInput
                        value={field.value ?? []}
                        onValueChange={field.onChange}
                        placeholder="Enter sizes here..."
                      />
                    )}


                    
                  />
                  {form.formState.errors.size && (
                    <p className="text-red-500 text-sm">
                      {form.formState.errors.size.message as string}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Color Select */}
              <Card className="pt-5">
                <CardContent>
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="h-[50px] border border-[#B6B6B6]">
                            <SelectValue placeholder="Select a color" />
                          </SelectTrigger>
                          <SelectContent>
                            {colorsData?.data.data.map((clr: any) => (
                              <SelectItem key={clr._id} value={clr._id}>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-4 h-4 rounded-full border"
                                    style={{ backgroundColor: clr.code }}
                                  />
                                  {clr.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Category */}
              <Card>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            const selected = categoriesData?.data.find(
                              (c: any) => c._id === val
                            );
                            setSelectedCategory(selected);
                          }}
                          value={field.value}
                        >
                          <SelectTrigger className="h-[50px] border border-[#B6B6B6]">
                            <SelectValue placeholder="Select a Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoriesData?.data.map((cat: any) => (
                              <SelectItem key={cat._id} value={cat._id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                          <FormMessage />
                        </Select>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Product Type */}
              <Card>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="productType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type</FormLabel>
                        <Select
                          disabled={deactiveProductType}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="h-[50px] border border-[#B6B6B6]">
                            <SelectValue placeholder="Select Product Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {productTypes.map((pt) => (
                              <SelectItem key={pt} value={pt}>
                                {pt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* SubCategory */}
              <Card>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="subCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sub-Category</FormLabel>
                        <Select
                          disabled={deactiveSubCategory}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="h-[50px] border border-[#B6B6B6]">
                            <SelectValue placeholder="Select Sub-Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {subCategories &&
                              subCategories?.map((sc) => (
                                <SelectItem key={sc._id} value={sc._id}>
                                  {sc.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                          <FormMessage />
                        </Select>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Brand Name */}
              <Card>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="brandName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Write your Brand Name..."
                            className="h-[50px] border border-[#B6B6B6]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Product Images */}
              <Card>
                <CardContent>
                  <Label className="text-sm font-medium text-gray-900 mb-4 block">
                    Add Product Image
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                    <div className="flex flex-col items-center">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 mb-1">
                        Note: Upload Max 200 *200 pixels and
                      </p>
                      <p className="text-sm text-gray-500">Formats PNG</p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <Button
                        variant="outline"
                        className="mt-4"
                        type="button"
                        onClick={() =>
                          document.getElementById("image-upload")?.click()
                        }
                      >
                        Upload Image
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {uploadedImages.map((image, index) => (
                      <div
                        key={index}
                        className="relative aspect-square border border-gray-300 rounded-lg overflow-hidden"
                      >
                        <Image
                          width={300}
                          height={300}
                          src={image}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm hover:bg-red-100"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                    {Array.from({
                      length: Math.max(0, 4 - uploadedImages.length),
                    }).map((_, index) => (
                      <div
                        key={`empty-${index}`}
                        className="aspect-square border border-gray-300 rounded-lg flex items-center justify-center bg-gray-50"
                      >
                        <ImageIcon className="w-6 h-6 text-gray-300" />
                      </div>
                    ))}
                  </div>
                  <div className="lg:col-span-3 flex flex-col gap-2">
  <Button
    type="submit"
    form="product-form"
    className="mt-4 bg-btnPrimary hover:bg-btnPrimary/60  w-full  !h-[50px] text-base flex items-center justify-center gap-2"
    disabled={createProductMutation.isPending || !form.getValues("subCategory")}
  >
    <Save className="!w-[20px] !h-[20px]" />
    Save Product
    {createProductMutation.isPending && (
      <Loader2 className="animate-spin ml-2" />
    )}
  </Button>
  
  {/* Message shown when button is disabled */}
  {(createProductMutation.isPending || !form.getValues("subCategory")) && (
    <p className="text-red-500 text-sm">
      { !form.getValues("subCategory") 
        ? "Please select a subcategory before saving." 
        : "Saving product..." }
    </p>
  )}
</div>

                </CardContent>
              </Card>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
